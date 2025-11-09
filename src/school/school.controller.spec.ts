import { Test, TestingModule } from '@nestjs/testing';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

describe('SchoolController', () => {
  let controller: SchoolController;
  let service: jest.Mocked<SchoolService>;
  let mockSchoolService: jest.Mocked<SchoolService>;

  beforeEach(async () => {
    mockSchoolService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<SchoolService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolController],
      providers: [
        {
          provide: SchoolService,
          useValue: mockSchoolService,
        },
      ],
    }).compile();

    controller = module.get<SchoolController>(SchoolController);
    service = module.get<SchoolService>(
      SchoolService,
    ) as jest.Mocked<SchoolService>;
  });

  const schoolData = {
    name: 'Springfield Elementary',
    studentCapacity: 500,
    city: 'Springfield',
    district: 'Shelbyville',
    phoneNumber: '+1-202-555-0147',
    email: 'contact@springfield.edu',
    website: 'https://springfield.edu',
  };

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to SchoolService.create', async () => {
      const result = { _id: '1', ...schoolData } as any;
      service.create.mockResolvedValue(result);

      await expect(controller.create(schoolData as any)).resolves.toEqual(
        result,
      );
      expect(service.create).toHaveBeenCalledWith(schoolData);
    });
  });

  describe('findAll', () => {
    it('should delegate to SchoolService.findAll', async () => {
      const result = [{ _id: '1', ...schoolData }] as any;
      service.findAll.mockResolvedValue(result);

      await expect(controller.findAll()).resolves.toEqual(result);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should delegate to SchoolService.findOne', async () => {
      const result = { _id: '1', ...schoolData } as any;
      service.findOne.mockResolvedValue(result);

      await expect(controller.findOne('1')).resolves.toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should delegate to SchoolService.update', async () => {
      const result = { _id: '1', ...schoolData, name: 'Updated' } as any;
      service.update.mockResolvedValue(result);

      await expect(
        controller.update('1', { name: 'Updated' } as any),
      ).resolves.toEqual(result);
      expect(service.update).toHaveBeenCalledWith('1', { name: 'Updated' });
    });
  });

  describe('remove', () => {
    it('should delegate to SchoolService.remove', async () => {
      service.remove.mockResolvedValue(undefined);

      await expect(controller.remove('1')).resolves.toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith('1');
    });
  });
});
