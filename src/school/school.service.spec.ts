import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SchoolService } from './school.service';
import { School } from './entities/school.entity';
import { UsersService } from '../users/users.service';

describe('SchoolService', () => {
  let service: SchoolService;
  let mockSchoolModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };
  let mockUsersService: { assignSchoolToUser: jest.Mock };

  beforeEach(async () => {
    mockSchoolModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    mockUsersService = {
      assignSchoolToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService,
        {
          provide: getModelToken(School.name),
          useValue: mockSchoolModel,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<SchoolService>(SchoolService);
  });

  const createSchoolDto = {
    name: 'Springfield Elementary',
    studentCapacity: 500,
    city: 'Springfield',
    district: 'Shelbyville',
    phoneNumber: '+1-202-555-0147',
    email: 'contact@springfield.edu',
    website: 'https://springfield.edu',
  };

  const schoolId = new Types.ObjectId().toHexString();
  const ownerId = new Types.ObjectId().toHexString();

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should require an owner id', async () => {
      await expect(
        service.create(createSchoolDto as any, ''),
      ).rejects.toThrow(BadRequestException);
      expect(mockSchoolModel.create).not.toHaveBeenCalled();
    });

    it('should create a school and assign it to the owner', async () => {
      const savedSchool = { _id: schoolId, ...createSchoolDto };
      mockSchoolModel.create.mockResolvedValue(savedSchool);

      await expect(
        service.create(createSchoolDto as any, ownerId),
      ).resolves.toEqual(savedSchool);
      expect(mockSchoolModel.create).toHaveBeenCalledWith(createSchoolDto);
      expect(mockUsersService.assignSchoolToUser).toHaveBeenCalledWith(
        ownerId,
        savedSchool._id,
      );
    });

    it('should translate duplicate key errors into ConflictException', async () => {
      mockSchoolModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.create(createSchoolDto as any, ownerId),
      ).rejects.toThrow(ConflictException);
      expect(mockUsersService.assignSchoolToUser).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all schools sorted by name', async () => {
      const schoolList = [{ _id: schoolId, ...createSchoolDto }];
      const execMock = jest.fn().mockResolvedValue(schoolList);
      const sortMock = jest.fn().mockReturnValue({ exec: execMock });
      mockSchoolModel.find.mockReturnValue({ sort: sortMock });

      await expect(service.findAll()).resolves.toEqual(schoolList);
      expect(mockSchoolModel.find).toHaveBeenCalled();
      expect(sortMock).toHaveBeenCalledWith({ name: 1 });
      expect(execMock).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return school when found', async () => {
      const school = { _id: schoolId, ...createSchoolDto };
      const execMock = jest.fn().mockResolvedValue(school);
      mockSchoolModel.findById.mockReturnValue({ exec: execMock });

      await expect(service.findOne(schoolId)).resolves.toEqual(school);
    });

    it('should throw NotFoundException when school is missing', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockSchoolModel.findById.mockReturnValue({ exec: execMock });

      await expect(service.findOne(schoolId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(
        service.update('invalid-id', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update school successfully', async () => {
      const updatedSchool = { _id: schoolId, ...createSchoolDto, name: 'New' };
      const execMock = jest.fn().mockResolvedValue(updatedSchool);
      mockSchoolModel.findByIdAndUpdate.mockReturnValue({ exec: execMock });

      await expect(
        service.update(schoolId, { name: 'New' } as any),
      ).resolves.toEqual(updatedSchool);
    });

    it('should throw NotFoundException when school is missing', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockSchoolModel.findByIdAndUpdate.mockReturnValue({ exec: execMock });

      await expect(
        service.update(schoolId, { name: 'New' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should translate duplicate key errors into ConflictException', async () => {
      const execMock = jest.fn().mockRejectedValue({ code: 11000 });
      mockSchoolModel.findByIdAndUpdate.mockReturnValue({ exec: execMock });

      await expect(
        service.update(schoolId, { name: 'New' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException for invalid id', async () => {
      await expect(service.remove('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should remove school successfully', async () => {
      const execMock = jest.fn().mockResolvedValue({ _id: schoolId });
      mockSchoolModel.findByIdAndDelete.mockReturnValue({ exec: execMock });

      await expect(service.remove(schoolId)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when school is missing', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockSchoolModel.findByIdAndDelete.mockReturnValue({ exec: execMock });

      await expect(service.remove(schoolId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
