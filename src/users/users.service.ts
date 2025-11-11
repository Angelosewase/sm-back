import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types, ClientSession } from 'mongoose';
import { Role, User } from './schemas/user.schema';
import { promises as fsPromises, existsSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { QueryUserDto } from './dto/query-user.dto';
import { RegisterDto } from './dto/register-user.dto';
import { isInstance } from 'class-validator';
import { School } from '../school/entities/school.entity';
import { hash } from 'crypto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(School.name) private schoolModel: Model<School>,
  ) {}

  async createUser(createUserDto: RegisterDto): Promise<User> {
    try {
      const user_ = await this.findByEmail(createUserDto.email);
      if (user_)
        throw new ConflictException('User with that email already exists');

      const school = await this.schoolModel.findById(createUserDto.school);
      if (!school)
        throw new BadRequestException(
          'School with that id "' + createUserDto.school + '" not found',
        );

      //hash the user's password
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = await this.userModel.create({
        ...createUserDto,
        password: hashedPassword,
        school,
      });

      return this.userModel
        .findById(user._id)
        .select('-password -__v')
        .exec() as any;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      } else if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(
          'You are not authorized to register user in the system',
        );
      } else if (error instanceof ConflictException) {
        throw new ConflictException('User with this email already exists');
      } else {
        throw new Error('Failed to register user');
      }
    }
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-password -__v').exec();
  }

  async getUserSchool(id: string): Promise<School | null> {
    return this.schoolModel.findById(id);
  }

  /**
   * Fetch multiple users by their ids in a single query. Returns array of users (lean)
   */
  async findByIds(ids: string[]): Promise<any[]> {
    if (!ids || !ids.length) return [];
    const uniq = Array.from(new Set(ids.map((i) => i.toString())));
    return this.userModel
      .find({ _id: { $in: uniq } })
      .select('-password -__v')
      .lean()
      .exec() as unknown as any[];
  }

  async findAll(query: QueryUserDto) {
    const {
      q,
      role,
      email,
      school,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const filter: FilterQuery<User> = {};
    if (role) filter.role = role;
    if (email) filter.email = email.toLowerCase();
    if (school) filter.school = school;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -__v')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });
  }
  async update(id: string, payload: UpdateUserDto) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();

    try {
      const user = await this.userModel.findById(id).session(session).exec();
      if (!user) throw new Error('User not found');
      const { school, ...rest } = payload;

      let schoolId: Types.ObjectId | undefined;
      if (school) {
        schoolId = typeof school === 'string' ? new Types.ObjectId(school) : school;

        const schoolDoc = await this.schoolModel
          .findById(schoolId)
          .session(session)
          .exec();
        if (!schoolDoc) throw new Error('School not found');
      }

      if (rest.email) {
        const user_ = await this.findByEmail(rest.email);
        if (user_ && user_.email !== user.email)
          throw new ConflictException('User with that email already exists');
      }

      if (user.school && schoolId) {
        await this.userModel.db
          .model('School')
          .findByIdAndUpdate(
            user.school,
            { $pull: { users: user._id } },
            { session },
          );
      }
      if (schoolId) {
        await this.userModel.db.model('School').findByIdAndUpdate(
          schoolId,
          { $addToSet: { users: user._id } },
          { session },
        );
      }

      const updateData: UpdateUserDto = {
        ...rest,
        ...(schoolId ? { school: schoolId as Types.ObjectId } : {}),
      };

      // Update the user
      const updatedUser = await this.userModel
        .findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true, runValidators: true, session },
        )
        .select('-password -__v')
        .exec();

      await session.commitTransaction();
      return updatedUser;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async remove(id: string) {
    await this.userModel.findByIdAndDelete(id).exec();
    return { deleted: true };
  }

  async saveAvatar(userId: string, filename: string) {
    // remove previous avatar file if present
    const user = await this.userModel.findById(userId).exec();
    if (user && (user as any).avatar) {
      try {
        const prev = (user as any).avatar as string;
        const fullPrev = prev.startsWith('/')
          ? prev
          : join(process.cwd(), prev);
        if (existsSync(fullPrev)) await fsPromises.unlink(fullPrev);
      } catch (e) {
        // non-fatal
      }
    }
    await this.userModel.findByIdAndUpdate(userId, { avatar: filename }).exec();
    return await this.findById(userId);
  }

  async removeAvatar(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return null;
    if ((user as any).avatar) {
      try {
        const prev = (user as any).avatar as string;
        const fullPrev = prev.startsWith('/')
          ? prev
          : join(process.cwd(), prev);
        if (existsSync(fullPrev)) await fsPromises.unlink(fullPrev);
      } catch (e) {
        // ignore
      }
    }
    await this.userModel
      .findByIdAndUpdate(userId, { $unset: { avatar: '' } })
      .exec();
    return await this.findById(userId);
  }
}
