import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import {
  RegistrationRequest,
  RegistrationRequestStatus,
} from './schemas/registration-request.schema';
import { CreateRegistrationRequestDto } from './dto/create-registration-request.dto';
import { UpdateRegistrationRequestDto } from './dto/update-registration-request.dto';
import { QueryRegistrationRequestsDto } from './dto/query-registration-requests.dto';

@Injectable()
export class RegistrationRequestsService {
  constructor(
    @InjectModel(RegistrationRequest.name)
    private readonly registrationRequestModel: Model<RegistrationRequest>,
  ) {}

  /**
   * Create a new registration request
   */
  async create(
    createDto: CreateRegistrationRequestDto,
  ): Promise<RegistrationRequest> {
    // Check if a request with this email already exists
    const existingRequest = await this.registrationRequestModel
      .findOne({ email: createDto.email.toLowerCase() })
      .exec();

    if (existingRequest) {
      throw new ConflictException(
        'A registration request with this email already exists',
      );
    }

    // Create the registration request
    const request = await this.registrationRequestModel.create({
      fullName: createDto.fullName,
      email: createDto.email.toLowerCase(),
      additionalNotes: createDto.additionalNotes || '',
      status: RegistrationRequestStatus.PENDING,
    });

    return request;
  }

  /**
   * Get all registration requests with optional filtering and pagination
   */
  async findAll(query: QueryRegistrationRequestsDto) {
    const { status, page = 1, limit = 10 } = query;

    const filter: FilterQuery<RegistrationRequest> = {};
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const sort = { createdAt: -1 }; // Most recent first

    const [items, total] = await Promise.all([
      this.registrationRequestModel
        .find(filter)
        .populate('reviewedBy', 'name email')
        .sort(sort as any)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.registrationRequestModel.countDocuments(filter).exec(),
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

  /**
   * Get a single registration request by ID
   */
  async findOne(id: string): Promise<RegistrationRequest> {
    const request = await this.registrationRequestModel
      .findById(id)
      .populate('reviewedBy', 'name email')
      .exec();

    if (!request) {
      throw new NotFoundException(
        `Registration request with id "${id}" not found`,
      );
    }

    return request;
  }

  /**
   * Update a registration request status (approve or reject)
   */
  async updateStatus(
    id: string,
    updateDto: UpdateRegistrationRequestDto,
    reviewedBy: string,
  ): Promise<RegistrationRequest> {
    const request = await this.registrationRequestModel.findById(id).exec();

    if (!request) {
      throw new NotFoundException(
        `Registration request with id "${id}" not found`,
      );
    }

    // Check if request is already processed
    if (request.status !== RegistrationRequestStatus.PENDING) {
      throw new BadRequestException(
        `This registration request has already been ${request.status}`,
      );
    }

    // Update the request
    const updatedRequest = await this.registrationRequestModel
      .findByIdAndUpdate(
        id,
        {
          status: updateDto.status,
          reviewedBy: new Types.ObjectId(reviewedBy),
          reviewedAt: new Date(),
        },
        { new: true },
      )
      .populate('reviewedBy', 'name email')
      .exec();

    return updatedRequest!;
  }

  /**
   * Get registration request statistics
   */
  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.registrationRequestModel.countDocuments().exec(),
      this.registrationRequestModel
        .countDocuments({ status: RegistrationRequestStatus.PENDING })
        .exec(),
      this.registrationRequestModel
        .countDocuments({ status: RegistrationRequestStatus.APPROVED })
        .exec(),
      this.registrationRequestModel
        .countDocuments({ status: RegistrationRequestStatus.REJECTED })
        .exec(),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }
}

