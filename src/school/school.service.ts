import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { School } from './entities/school.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class SchoolService {
  private readonly uploadsDir = 'uploads/schools-logos';

  constructor(
    @InjectModel(School.name)
    private readonly schoolModel: Model<School>,
    private readonly usersService: UsersService,
  ) {
    // Ensure uploads directory exists
    this.ensureUploadsDir();
  }

  private ensureUploadsDir(): void {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  private deleteFile(filePath: string): void {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  async create(
    createSchoolDto: CreateSchoolDto,
    ownerId: string,
    file?: Express.Multer.File,
  ): Promise<School> {
    if (!ownerId) {
      throw new BadRequestException('Owner id is required to create a school');
    }

    try {
      const school: any = await this.schoolModel.create(
        { ...createSchoolDto,
          logo: file ? file.filename : '' },
      );
      
      await this.usersService.assignSchoolToUser(
        ownerId,
        school._id.toString(),
      );
      return school;
    } catch (error: any) {
      console.log('the error is: ', error);
      if (error?.code === 11000) {
        throw new ConflictException(
          'A school with the provided unique details already exists',
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<School[]> {
    const schools = await this.schoolModel.find().sort({ name: 1 }).exec();
    const base = process.env.API_BASE_URL
      ? process.env.API_BASE_URL.replace(/\/$/, '')
      : '';
    return schools.map((s) => {
      const obj: any = s.toObject ? s.toObject() : s;
      obj.logoUrl = obj.logo
        ? `${base}/uploads/schools-logos/${obj.logo}`
        : null;
      return obj;
    });
  }

  async findOne(id: string): Promise<School> {
    this.validateObjectId(id);
    const school = await this.schoolModel.findById(id).exec();

    if (!school) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }

    const base = process.env.API_BASE_URL
      ? process.env.API_BASE_URL.replace(/\/$/, '')
      : '';
    const obj: any = school.toObject ? school.toObject() : school;
    console.log("the object is: ", `${base}/uploads/schools-logos/${obj.logo}`);
    obj.logoUrl = obj.logo ? `${base}/uploads/schools-logos/${obj.logo}` : null;

    return obj;
  }

  async update(
    id: string,
    updateSchoolDto: UpdateSchoolDto,
    file?: any,
  ): Promise<School> {
    this.validateObjectId(id);

    try {
      const school = await this.schoolModel.findById(id).exec();
      if (!school) {
        throw new NotFoundException(`School with id "${id}" not found`);
      }

      // Handle logo file if provided
      const updateData: any = { ...updateSchoolDto };

      if (file) {
        // Delete old logo if it exists
        if (school.logo) {
          this.deleteFile(path.join(this.uploadsDir, school.logo));
        }
        // Save only the filename
        updateData.logo = file.filename;
      } else {
        // Don't update logo if no file is provided
        delete updateData.logo;
      }

      const updatedSchool = await this.schoolModel
        .findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updatedSchool) {
        throw new NotFoundException(`School with id "${id}" not found`);
      }

      return updatedSchool;
    } catch (error: any) {
      // Clean up uploaded file if there was an error
      if (file) {
        this.deleteFile(path.join(this.uploadsDir, file.filename));
      }
      if (error?.code === 11000) {
        throw new ConflictException(
          'A school with the provided unique details already exists',
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    this.validateObjectId(id);
    const school = await this.schoolModel.findById(id).exec();

    if (!school) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }

    // Delete associated logo file if it exists
    if (school.logo) {
      this.deleteFile(path.join(this.uploadsDir, school.logo));
    }

    await this.schoolModel.findByIdAndDelete(id).exec();
  }

  async activate(id: string): Promise<School> {
    this.validateObjectId(id);
    const school = await this.schoolModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .exec();

    if (!school) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }

    return school;
  }

  async deactivate(id: string): Promise<School> {
    this.validateObjectId(id);
    const school = await this.schoolModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();

    if (!school) {
      throw new NotFoundException(`School with id "${id}" not found`);
    }

    return school;
  }

  private validateObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid school id "${id}"`);
    }
  }
}
