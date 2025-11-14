import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PassMarks, PassMarksDocument } from './schemas/pass-marks.schema';
import { CreatePassMarksDto } from './dto/create-pass-marks.dto';
import { UpdatePassMarksDto } from './dto/update-pass-marks.dto';

@Injectable()
export class PassMarksService {
  constructor(
    @InjectModel(PassMarks.name)
    private passMarksModel: Model<PassMarksDocument>,
  ) {}

  /**
   * Create pass marks configuration for a school
   * Only one configuration per school is allowed
   */
  async create(
    createPassMarksDto: CreatePassMarksDto,
    userId?: string,
  ): Promise<PassMarks> {
    // Validate that second sitting range is logical
    if (createPassMarksDto.secondSittingMin >= createPassMarksDto.secondSittingMax) {
      throw new BadRequestException(
        'secondSittingMin must be less than secondSittingMax',
      );
    }

    // Validate that fail mark is less than second sitting min
    if (createPassMarksDto.failMark >= createPassMarksDto.secondSittingMin) {
      throw new BadRequestException(
        'failMark must be less than secondSittingMin',
      );
    }

    // Validate that second sitting max is less than pass mark
    if (createPassMarksDto.secondSittingMax >= createPassMarksDto.passMark) {
      throw new BadRequestException(
        'secondSittingMax must be less than passMark',
      );
    }

    // Check if pass marks already exist for this school
    const existing = await this.passMarksModel.findOne({
      school: new Types.ObjectId(createPassMarksDto.school),
    });

    if (existing) {
      throw new ConflictException(
        'Pass marks configuration already exists for this school. Use update instead.',
      );
    }

    const passMarks = new this.passMarksModel({
      ...createPassMarksDto,
      school: new Types.ObjectId(createPassMarksDto.school),
      updatedBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    return passMarks.save();
  }

  /**
   * Update pass marks configuration for a school
   */
  async update(
    schoolId: string,
    updatePassMarksDto: UpdatePassMarksDto,
    userId?: string,
  ): Promise<PassMarks> {
    const passMarks = await this.passMarksModel.findOne({
      school: new Types.ObjectId(schoolId),
    });

    if (!passMarks) {
      throw new NotFoundException(
        'Pass marks configuration not found for this school',
      );
    }

    // Get current values or updated values for validation
    const passMark = updatePassMarksDto.passMark ?? passMarks.passMark;
    const secondSittingMin =
      updatePassMarksDto.secondSittingMin ?? passMarks.secondSittingMin;
    const secondSittingMax =
      updatePassMarksDto.secondSittingMax ?? passMarks.secondSittingMax;
    const failMark = updatePassMarksDto.failMark ?? passMarks.failMark;

    // Validate that second sitting range is logical
    if (secondSittingMin >= secondSittingMax) {
      throw new BadRequestException(
        'secondSittingMin must be less than secondSittingMax',
      );
    }

    // Validate that fail mark is less than second sitting min
    if (failMark >= secondSittingMin) {
      throw new BadRequestException(
        'failMark must be less than secondSittingMin',
      );
    }

    // Validate that second sitting max is less than pass mark
    if (secondSittingMax >= passMark) {
      throw new BadRequestException(
        'secondSittingMax must be less than passMark',
      );
    }

    // Update fields
    if (updatePassMarksDto.passMark !== undefined) {
      passMarks.passMark = updatePassMarksDto.passMark;
    }
    if (updatePassMarksDto.secondSittingMin !== undefined) {
      passMarks.secondSittingMin = updatePassMarksDto.secondSittingMin;
    }
    if (updatePassMarksDto.secondSittingMax !== undefined) {
      passMarks.secondSittingMax = updatePassMarksDto.secondSittingMax;
    }
    if (updatePassMarksDto.failMark !== undefined) {
      passMarks.failMark = updatePassMarksDto.failMark;
    }

    if (userId) {
      passMarks.updatedBy = new Types.ObjectId(userId);
    }

    return passMarks.save();
  }

  /**
   * Get pass marks configuration for a school
   */
  async findBySchool(schoolId: string): Promise<PassMarks | null> {
    return this.passMarksModel
      .findOne({ school: new Types.ObjectId(schoolId) })
      .populate('school', 'name')
      .populate('updatedBy', 'name email')
      .exec();
  }

  /**
   * Get all pass marks configurations
   */
  async findAll(): Promise<PassMarks[]> {
    return this.passMarksModel
      .find()
      .populate('school', 'name')
      .populate('updatedBy', 'name email')
      .exec();
  }

  /**
   * Delete pass marks configuration for a school
   */
  async delete(schoolId: string): Promise<void> {
    const result = await this.passMarksModel.deleteOne({
      school: new Types.ObjectId(schoolId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        'Pass marks configuration not found for this school',
      );
    }
  }
}

