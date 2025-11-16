import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ChangeStudentClassDto } from './dto/change-student-class.dto';
import { NotFoundException } from '@nestjs/common';

describe('StudentController', () => {
  let controller: StudentController;
  let service: jest.Mocked<StudentService>;

  beforeEach(async () => {
    const mockService: jest.Mocked<StudentService> = {
      registerStudent: jest.fn(),
      findStudents: jest.fn(),
      getStudentById: jest.fn(),
      updateStudent: jest.fn(),
      changeStudentClass: jest.fn(),
      trashStudent: jest.fn(),
      bulkTrashStudents: jest.fn(),
      restoreStudent: jest.fn(),
      bulkRestoreStudents: jest.fn(),
      removeStudent: jest.fn(),
      bulkRemoveStudents: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        {
          provide: StudentService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<StudentController>(StudentController);
    service = module.get(StudentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a student', async () => {
    const dto = { studentId: '001', name: 'Lisa' } as CreateStudentDto;
    service.registerStudent.mockResolvedValue({ id: '1' } as any);

    const result = await controller.create(dto);

    expect(service.registerStudent).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: '1' });
  });

  it('lists students', async () => {
    const query = { search: 'Lisa' } as QueryStudentsDto;
    const response = { data: [], meta: { total: 0, page: 1, limit: 25, pages: 1 } };
    service.findStudents.mockResolvedValue(response as any);

    const result = await controller.list(query);

    expect(service.findStudents).toHaveBeenCalledWith(query);
    expect(result).toBe(response);
  });

  describe('get', () => {
    it('returns the student when found', async () => {
      const student = { id: '1' };
      service.getStudentById.mockResolvedValue(student as any);

      const result = await controller.get('1');

      expect(service.getStudentById).toHaveBeenCalledWith('1');
      expect(result).toBe(student);
    });

    it('throws NotFoundException when student is missing', async () => {
      service.getStudentById.mockResolvedValue(null);

      await expect(controller.get('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('updates a student', async () => {
    const dto = { name: 'Maggie' } as UpdateStudentDto;
    service.updateStudent.mockResolvedValue({ id: '1' } as any);

    const result = await controller.update('1', dto);

    expect(service.updateStudent).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual({ id: '1' });
  });

  it('changes student class', async () => {
    const dto = { classId: 'class' } as ChangeStudentClassDto;
    service.changeStudentClass.mockResolvedValue({ id: '1' } as any);

    const result = await controller.changeClass('1', dto);

    expect(service.changeStudentClass).toHaveBeenCalledWith('1', dto);
    expect(result).toEqual({ id: '1' });
  });

  it('trashes a student', async () => {
    service.trashStudent.mockResolvedValue({ id: '1' } as any);

    const result = await controller.trash('1');

    expect(service.trashStudent).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1' });
  });

  it('bulk trashes students', async () => {
    const dto = { ids: ['1', '2'] };
    const trashed = [{ id: '1' }, { id: '2' }];
    service.bulkTrashStudents.mockResolvedValue(trashed as any);

    const result = await controller.bulkTrash(dto as any);

    expect(service.bulkTrashStudents).toHaveBeenCalledWith(dto.ids);
    expect(result).toEqual(trashed);
  });

  it('restores a student', async () => {
    service.restoreStudent.mockResolvedValue({ id: '1' } as any);

    const result = await controller.restore('1');

    expect(service.restoreStudent).toHaveBeenCalledWith('1');
    expect(result).toEqual({ id: '1' });
  });

  it('bulk restores students', async () => {
    const dto = { ids: ['1', '2'] };
    const restored = [{ id: '1' }, { id: '2' }];
    service.bulkRestoreStudents.mockResolvedValue(restored as any);

    const result = await controller.bulkRestore(dto as any);

    expect(service.bulkRestoreStudents).toHaveBeenCalledWith(dto.ids);
    expect(result).toEqual(restored);
  });

  it('removes a student', async () => {
    service.removeStudent.mockResolvedValue(undefined);

    const result = await controller.remove('1');

    expect(service.removeStudent).toHaveBeenCalledWith('1');
    expect(result).toEqual({ deleted: true });
  });

  it('bulk removes students', async () => {
    const dto = { ids: ['1', '2'] };
    service.bulkRemoveStudents.mockResolvedValue(undefined);

    const result = await controller.bulkRemove(dto as any);

    expect(service.bulkRemoveStudents).toHaveBeenCalledWith(dto.ids);
    expect(result).toEqual({ deleted: true, count: dto.ids.length });
  });
});


