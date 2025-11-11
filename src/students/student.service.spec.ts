import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { Student } from './schemas/student.schema';
import { Class } from '../classes/schemas/class.schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';

const createSessionMock = () => ({
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
});

const createQueryChain = <T = unknown>(resolvedValue: T) => {
  const exec = jest.fn().mockResolvedValue(resolvedValue);
  const chain: any = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    exec,
  };
  return { chain, exec };
};

const createUpdateChain = () => {
  const exec = jest.fn().mockResolvedValue(undefined);
  const chain = {
    session: jest.fn().mockReturnValue({ exec }),
  };
  return { chain, exec };
};

describe('StudentService', () => {
  let service: StudentService;
  let mockStudentModel: any;
  let mockClassModel: any;
  let session: ReturnType<typeof createSessionMock>;

  beforeEach(async () => {
    session = createSessionMock();

    mockStudentModel = jest
      .fn()
      .mockImplementation((payload: Record<string, any>) => {
        return {
          ...payload,
          _id: new Types.ObjectId(),
          save: jest.fn().mockResolvedValue(undefined),
          deleteOne: jest.fn().mockResolvedValue(undefined),
          set: jest.fn(),
          isTrashed: payload.isTrashed ?? false,
        };
      });

    mockStudentModel.db = {
      startSession: jest.fn().mockResolvedValue(session),
    };

    mockStudentModel.find = jest.fn();
    mockStudentModel.findById = jest.fn();
    mockStudentModel.countDocuments = jest.fn();
    mockStudentModel.updateOne = jest.fn();

    mockClassModel = {
      findById: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: getModelToken(Student.name),
          useValue: mockStudentModel,
        },
        {
          provide: getModelToken(Class.name),
          useValue: mockClassModel,
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerStudent', () => {
    it('creates a student and commits the transaction', async () => {
      const dto: CreateStudentDto = {
        studentId: 'STU-001',
        name: 'Lisa Simpson',
      } as CreateStudentDto;

      const createdStudent = { id: 'created' };
      jest
        .spyOn(service, 'getStudentById')
        .mockResolvedValue(createdStudent as any);

      const result = await service.registerStudent(dto);

      expect(mockStudentModel).toHaveBeenCalledWith({
        studentId: dto.studentId,
        name: dto.name.trim(),
        isTrashed: false,
        trashedAt: null,
      });
      const newStudentInstance = mockStudentModel.mock.results[0].value;
      expect(newStudentInstance.save).toHaveBeenCalledWith({ session });
      expect(session.commitTransaction).toHaveBeenCalledTimes(1);
      expect(session.endSession).toHaveBeenCalledTimes(1);
      expect(result).toBe(createdStudent);
    });

    it('translates duplicate key errors into BadRequestException', async () => {
      const dto: CreateStudentDto = {
        studentId: 'STU-001',
        name: 'Lisa Simpson',
      } as CreateStudentDto;

      const newStudentInstance = {
        _id: new Types.ObjectId(),
        save: jest.fn().mockRejectedValue({ code: 11000 }),
        deleteOne: jest.fn(),
        set: jest.fn(),
        isTrashed: false,
      };
      mockStudentModel.mockImplementationOnce(() => newStudentInstance);

      await expect(service.registerStudent(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(session.abortTransaction).toHaveBeenCalledTimes(1);
      expect(session.endSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('findStudents', () => {
    it('applies filters, sorting, and pagination', async () => {
      const classId = new Types.ObjectId().toHexString();
      const schoolId = new Types.ObjectId().toHexString();
      const query: QueryStudentsDto = {
        page: 2,
        limit: 10,
        search: 'Lisa',
        status: 'active' as any,
        guardianRelationShip: 'mother' as any,
        district: 'Downtown',
        province: 'Springfield Province',
        gradeLevel: 'Grade 4',
        guardianEmail: 'GUARDIAN@EXAMPLE.COM',
        classId,
        schoolId,
        includeTrashed: false,
        onlyTrashed: false,
        sortBy: 'unsupported-field',
        sortOrder: 'asc',
      };

      const students = [{ _id: '1' }];
      const { chain: findChain } = createQueryChain(students);
      mockStudentModel.find.mockReturnValue(findChain);

      const count = 37;
      const countExec = jest.fn().mockResolvedValue(count);
      mockStudentModel.countDocuments.mockReturnValue({ exec: countExec });

      const result = await service.findStudents(query);

      const filter = mockStudentModel.find.mock.calls[0][0];
      expect(filter.status).toBe(query.status);
      expect(filter.guardianRelationShip).toBe(query.guardianRelationShip);
      expect(filter.district).toBe(query.district);
      expect(filter.province).toBe(query.province);
      expect(filter.gradeLevel).toBe(query.gradeLevel);
      expect(filter.guardianEmail).toBe(query.guardianEmail.toLowerCase());
      expect(filter.class).toEqual(new Types.ObjectId(classId));
      expect(filter.school).toEqual(new Types.ObjectId(schoolId));
      expect(filter.isTrashed).toBe(false);
      expect(filter.$or).toBeDefined();
      expect(filter.$or[0].name).toBeInstanceOf(RegExp);

      expect(findChain.sort).toHaveBeenCalledWith({ createdAt: 1 });
      expect(findChain.skip).toHaveBeenCalledWith(10);
      expect(findChain.limit).toHaveBeenCalledWith(10);
      expect(countExec).toHaveBeenCalledWith();

      expect(result).toEqual({
        data: students,
        meta: {
          total: count,
          page: 2,
          limit: 10,
          pages: Math.ceil(count / 10),
        },
      });
    });
  });

  describe('getStudentById', () => {
    it('returns null when id is invalid', async () => {
      const result = await service.getStudentById('invalid');
      expect(result).toBeNull();
      expect(mockStudentModel.findById).not.toHaveBeenCalled();
    });
  });

  describe('updateStudent', () => {
    it('throws NotFoundException when student does not exist', async () => {
      const { chain } = createQueryChain(null);
      mockStudentModel.findById.mockReturnValue(chain);

      await expect(
        service.updateStudent(new Types.ObjectId().toHexString(), {} as any),
      ).rejects.toThrow(NotFoundException);

      expect(session.abortTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('changeStudentClass', () => {
    it('reassigns class and updates counters', async () => {
      const studentId = new Types.ObjectId().toHexString();
      const currentClassId = new Types.ObjectId();
      const newClassId = new Types.ObjectId().toHexString();

      const studentDoc: any = {
        _id: studentId,
        class: currentClassId,
        isTrashed: false,
        save: jest.fn().mockResolvedValue(undefined),
      };

      const findChain = {
        session: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(studentDoc) }),
      };
      mockStudentModel.findById.mockReturnValue(findChain);

      mockClassModel.findById.mockReturnValue({
        session: jest.fn().mockResolvedValue({
          _id: newClassId,
          studentCount: 10,
          capacity: 30,
          isTrashed: false,
        }),
      });

      const updateChain = createUpdateChain();
      mockClassModel.updateOne.mockReturnValue(updateChain.chain);

      jest
        .spyOn(service, 'getStudentById')
        .mockResolvedValue({ _id: studentId } as any);

      const result = await service.changeStudentClass(studentId, {
        classId: newClassId,
      });

      expect(result).toEqual({ _id: studentId });

      expect(mockClassModel.updateOne).toHaveBeenCalledWith(
        { _id: currentClassId.toString(), studentCount: { $gt: 0 } },
        { $inc: { studentCount: -1 } },
      );
      expect(mockClassModel.updateOne).toHaveBeenCalledWith(
        { _id: newClassId },
        { $inc: { studentCount: 1 } },
      );
      expect(studentDoc.class).toEqual(new Types.ObjectId(newClassId));
      expect(studentDoc.save).toHaveBeenCalledWith({ session });
      expect(session.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });
});


