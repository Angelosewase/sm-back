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

describe('SchoolService', () => {
  let service: SchoolService;
  const mockSchoolModel = jest.fn() as unknown as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    (mockSchoolModel as unknown as jest.Mock).mockImplementation(() => ({
      save: jest.fn(),
    }));

    (mockSchoolModel as any).find = jest.fn();
    (mockSchoolModel as any).findById = jest.fn();
    (mockSchoolModel as any).findByIdAndUpdate = jest.fn();
    (mockSchoolModel as any).findByIdAndDelete = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchoolService,
        {
          provide: getModelToken(School.name),
          useValue: mockSchoolModel,
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a school successfully', async () => {
      const savedSchool = { _id: schoolId, ...createSchoolDto };
      (mockSchoolModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(savedSchool),
      }));

      await expect(service.create(createSchoolDto as any)).resolves.toEqual(
        savedSchool,
      );
    });

    it('should translate duplicate key errors into ConflictException', async () => {
      (mockSchoolModel as unknown as jest.Mock).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue({ code: 11000 }),
      }));

      await expect(service.create(createSchoolDto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all schools sorted by name', async () => {
      const schoolList = [{ _id: schoolId, ...createSchoolDto }];
      (mockSchoolModel as any).find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(schoolList),
        }),
      });

      await expect(service.findAll()).resolves.toEqual(schoolList);
      expect((mockSchoolModel as any).find).toHaveBeenCalled();
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
      (mockSchoolModel as any).findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(school),
      });

      await expect(service.findOne(schoolId)).resolves.toEqual(school);
    });

    it('should throw NotFoundException when school is missing', async () => {
      (mockSchoolModel as any).findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

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
      (mockSchoolModel as any).findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedSchool),
      });

      await expect(
        service.update(schoolId, { name: 'New' } as any),
      ).resolves.toEqual(updatedSchool);
    });

    it('should throw NotFoundException when school is missing', async () => {
      (mockSchoolModel as any).findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.update(schoolId, { name: 'New' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should translate duplicate key errors into ConflictException', async () => {
      (mockSchoolModel as any).findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockRejectedValue({ code: 11000 }),
      });

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
      (mockSchoolModel as any).findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: schoolId }),
      });

      await expect(service.remove(schoolId)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when school is missing', async () => {
      (mockSchoolModel as any).findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove(schoolId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
