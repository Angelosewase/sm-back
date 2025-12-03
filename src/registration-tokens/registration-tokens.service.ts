import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RegistrationToken, TokenStatus } from './schemas/registration-token.schema';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { Role, User } from '../users/schemas/user.schema';
import * as crypto from 'crypto';
import { School } from '../school/entities/school.entity';

@Injectable()
export class RegistrationTokensService {
  constructor(
    @InjectModel(RegistrationToken.name)
    private readonly tokenModel: Model<RegistrationToken>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
  ) {}

  /**
   * Generate a unique registration token
   */
  async generateToken(
    createDto: GenerateTokenDto,
    createdBy: string,
    schoolId?: string | null,
  ): Promise<RegistrationToken> {
    // Validate role permissions
    const creator = await this.userModel.findById(createdBy);
    if (!creator) {
      throw new NotFoundException('User not found');
    }

    if (creator.role === Role.SUPER_ADMIN && createDto.role !== Role.SCHOOL_OWNER) {
      throw new ForbiddenException('Super Admin can only generate tokens for School Owners');
    }
    if ((creator.role === Role.ADMIN || creator.role === Role.SCHOOL_OWNER) && 
        createDto.role === Role.SCHOOL_OWNER) {
      throw new ForbiddenException('School Admins cannot generate tokens for School Owners');
    }
    if (creator.role === Role.HEADTeacher && createDto.role !== Role.TEACHER) {
      throw new ForbiddenException('Headteachers can only generate tokens for Teachers');
    }
    let finalSchoolId = schoolId;
    if (createDto.role === Role.TEACHER || createDto.role === Role.HEADTeacher) {
      if (!finalSchoolId && creator.school) {
        finalSchoolId = creator.school.toString();
      }
      if (!finalSchoolId) {
        throw new BadRequestException('School ID is required for Teacher and Headteacher tokens');
      }
      if (creator.school && creator.school.toString() !== finalSchoolId) {
        throw new ForbiddenException('You can only generate tokens for your own school');
      }
    }

    if (createDto.role === Role.SCHOOL_OWNER && finalSchoolId) {
      throw new BadRequestException('School ID should not be provided for School Owner tokens');
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    const expiresInDays = createDto.expiresInDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create token document
    const tokenDoc = await this.tokenModel.create({
      token,
      role: createDto.role,
      schoolId: createDto.role === Role.SCHOOL_OWNER ? null : new Types.ObjectId(finalSchoolId!),
      expiresAt,
      createdBy: new Types.ObjectId(createdBy),
      status: TokenStatus.PENDING,
    });

    return tokenDoc;
  }

  /**
   * Validate a registration token
   */
  async validateToken(token: string): Promise<RegistrationToken> {
    const tokenDoc = await this.tokenModel.findOne({ token }).exec();

    if (!tokenDoc) {
      throw new NotFoundException('Invalid registration token');
    }

    if (tokenDoc.status === TokenStatus.USED) {
      throw new BadRequestException('This registration token has already been used');
    }

    if (new Date() > tokenDoc.expiresAt) {
      await this.tokenModel.findByIdAndUpdate(tokenDoc._id, {
        status: TokenStatus.EXPIRED,
      }).exec();
      throw new BadRequestException('This registration token has expired');
    }

    // Check if token status is pending
    if (tokenDoc.status !== TokenStatus.PENDING) {
      throw new BadRequestException('This registration token is not valid');
    }

    return tokenDoc;
  }

  /**
   * Mark a token as used
   */
  async markTokenAsUsed(
    tokenId: string,
    usedBy: string,
    usedFromIp?: string,
  ): Promise<void> {
    await this.tokenModel.findByIdAndUpdate(tokenId, {
      status: TokenStatus.USED,
      usedAt: new Date(),
      usedBy: new Types.ObjectId(usedBy),
      usedFromIp: usedFromIp || null,
    }).exec();
  }


  async getTokenByTokenString(token: string): Promise<RegistrationToken | null> {
    return this.tokenModel.findOne({ token }).exec();
  }

  /**
   * Get all tokens created by a user (for admin dashboard)
   */
  async getTokensByCreator(createdBy: string, role?: Role) {
    const filter: any = { createdBy: new Types.ObjectId(createdBy) };
    if (role) {
      filter.role = role;
    }

    return this.tokenModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('schoolId', 'name')
      .populate('createdBy', 'email name')
      .populate('usedBy', 'email name')
      .exec();
  }

 
  async getTokenStats(createdBy: string) {
    const creatorId = new Types.ObjectId(createdBy);
    
    const [total, pending, used, expired] = await Promise.all([
      this.tokenModel.countDocuments({ createdBy: creatorId }),
      this.tokenModel.countDocuments({ createdBy: creatorId, status: TokenStatus.PENDING }),
      this.tokenModel.countDocuments({ createdBy: creatorId, status: TokenStatus.USED }),
      this.tokenModel.countDocuments({ createdBy: creatorId, status: TokenStatus.EXPIRED }),
    ]);

    return {
      total,
      pending,
      used,
      expired,
    };
  }
}

