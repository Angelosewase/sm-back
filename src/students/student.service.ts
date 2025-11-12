import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  FilterQuery,
  Model,
  Types,
  isValidObjectId,
} from 'mongoose';
import { Student, StudentDocument } from './schemas/student.schema';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentsDto } from './dto/query-students.dto';
import { ChangeStudentClassDto } from './dto/change-student-class.dto';
import { Class, ClassDocument } from '../classes/schemas/class.schema';

type PaginatedStudents = {
  data: Student[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

const SORTABLE_FIELDS = new Set([
  'name',
  'studentId',
  'createdAt',
  'updatedAt',
  'status',
  'gradeLevel',
]);

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,
    @InjectModel(Class.name) private readonly classModel: Model<ClassDocument>,
  ) {}

  async registerStudent(dto: CreateStudentDto): Promise<Student> {
    const session = await this.studentModel.db.startSession();
    session.startTransaction();

    try {
      const student = new this.studentModel(
        await this.mapDtoToStudentDocument(dto, session),
      );

      await student.save({ session });

      await session.commitTransaction();

      return (await this.getStudentById(
        (student as any)._id.toString(),
      )) as Student;
    } catch (error: any) {
      await session.abortTransaction();

      if (error?.code === 11000) {
        throw new BadRequestException('Duplicate studentId for school');
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  async findStudents(query: QueryStudentsDto): Promise<PaginatedStudents> {
    const {
      page = 1,
      limit = 25,
      search,
      status,
      classId,
      schoolId,
      guardianRelationShip,
      district,
      province,
      gradeLevel,
      guardianEmail,
      includeTrashed = false,
      onlyTrashed = false,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: FilterQuery<StudentDocument> = {};

    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: regex },
        { studentId: regex },
        { email: regex },
        { phoneNumber: regex },
        { district: regex },
        { province: regex },
        { gradeLevel: regex },
        { guardianEmail: regex },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (guardianRelationShip) {
      filter.guardianRelationShip = guardianRelationShip;
    }

    if (district) {
      filter.district = district;
    }

    if (province) {
      filter.province = province;
    }

    if (gradeLevel) {
      filter.gradeLevel = gradeLevel;
    }

    if (guardianEmail) {
      filter.guardianEmail = guardianEmail.toLowerCase();
    }

    if (classId && isValidObjectId(classId)) {
      filter.class = new Types.ObjectId(classId);
    }

    if (schoolId && isValidObjectId(schoolId)) {
      filter.school = new Types.ObjectId(schoolId);
    }

    if (onlyTrashed) {
      filter.isTrashed = true;
    } else if (!includeTrashed) {
      filter.isTrashed = false;
    }

    const safeSortBy = SORTABLE_FIELDS.has(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.studentModel
        .find(filter)
        .populate('class')
        .populate('school')
        .sort({ [safeSortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.studentModel.countDocuments(filter).exec(),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  async getStudentById(id: string): Promise<Student | null> {
    if (!isValidObjectId(id)) {
      return null;
    }

    return this.studentModel
      .findById(id)
      .populate('class')
      .populate('school')
      .exec();
  }

  async updateStudent(id: string, dto: UpdateStudentDto): Promise<Student> {
    const session = await this.studentModel.db.startSession();
    session.startTransaction();

    try {
      const student = await this.studentModel
        .findById(id)
        .session(session)
        .exec();

      if (!student) {
        throw new NotFoundException(`Student with id ${id} not found`);
      }

      await this.assignDtoToStudent(student, dto, session);

      await student.save({ session });

      await session.commitTransaction();

      return (await this.getStudentById(id)) as Student;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async changeStudentClass(
    id: string,
    payload: ChangeStudentClassDto,
  ): Promise<Student> {
    const session = await this.studentModel.db.startSession();
    session.startTransaction();

    try {
      const student = await this.studentModel
        .findById(id)
        .session(session)
        .exec();

      if (!student) {
        throw new NotFoundException(`Student with id ${id} not found`);
      }

      const hasClassId = Object.prototype.hasOwnProperty.call(
        payload,
        'classId',
      );
      const targetClassId = hasClassId ? (payload.classId ?? null) : undefined;

      await this.updateStudentClass(student, targetClassId, session);

      await student.save({ session });

      await session.commitTransaction();

      return (await this.getStudentById(id)) as Student;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async trashStudent(id: string): Promise<Student> {
    return this.updateTrashState(id, true);
  }

  async restoreStudent(id: string): Promise<Student> {
    return this.updateTrashState(id, false);
  }

  async bulkTrashStudents(ids: string[]): Promise<Student[]> {
    return Promise.all(ids.map((id) => this.trashStudent(id)));
  }

  async bulkRestoreStudents(ids: string[]): Promise<Student[]> {
    return Promise.all(ids.map((id) => this.restoreStudent(id)));
  }

  async bulkRemoveStudents(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.removeStudent(id);
    }
  }

  async removeStudent(id: string): Promise<void> {
    const session = await this.studentModel.db.startSession();
    session.startTransaction();

    try {
      const student = await this.studentModel
        .findById(id)
        .session(session)
        .exec();

      if (!student) {
        throw new NotFoundException(`Student with id ${id} not found`);
      }

      await this.updateStudentClass(student, null, session);

      await student.deleteOne({ session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  private async mapDtoToStudentDocument(
    dto: CreateStudentDto,
    session: ClientSession,
  ): Promise<Partial<Student>> {
    if (dto.isTrashed && dto.classId) {
      throw new BadRequestException(
        'Cannot assign a class to a student that is marked as trashed',
      );
    }

    const payload: Partial<Student> = {
      studentId: dto.studentId,
      name: dto.name?.trim(),
      isTrashed: dto.isTrashed ?? false,
      trashedAt: dto.isTrashed ? new Date() : null,
    };

    if (dto.email !== undefined) {
      payload.email = dto.email ? dto.email.toLowerCase() : undefined;
    }

    if (dto.phoneNumber !== undefined) {
      payload.phoneNumber = dto.phoneNumber;
    }

    if (dto.district !== undefined) {
      payload.district = dto.district;
    }

    if (dto.province !== undefined) {
      payload.province = dto.province;
    }

    if (dto.gradeLevel !== undefined) {
      payload.gradeLevel = dto.gradeLevel;
    }

    if (dto.gender !== undefined) {
      payload.gender = dto.gender;
    }

    if (dto.address !== undefined) {
      payload.address = dto.address;
    }

    if (dto.previousSchool !== undefined) {
      payload.previousSchool = dto.previousSchool;
    }

    if (dto.guardianName !== undefined) {
      payload.guardianName = dto.guardianName;
    }

    if (dto.guardianPhoneNumber !== undefined) {
      payload.guardianPhoneNumber = dto.guardianPhoneNumber;
    }

    if (dto.guardianEmail !== undefined) {
      payload.guardianEmail = dto.guardianEmail
        ? dto.guardianEmail.toLowerCase()
        : undefined;
    }

    if (dto.guardianRelationShip !== undefined) {
      payload.guardianRelationShip = dto.guardianRelationShip;
    }

    if (dto.guardianEmergencyContact !== undefined) {
      payload.guardianEmergencyContact = dto.guardianEmergencyContact;
    }

    if (dto.medicalInformation !== undefined) {
      payload.medicalInformation = dto.medicalInformation;
    }

    if (dto.additionalNotes !== undefined) {
      payload.additionalNotes = dto.additionalNotes;
    }

    if (dto.status !== undefined) {
      payload.status = dto.status;
    }

    if (dto.dob) {
      payload.dob = new Date(dto.dob);
    }

    if (dto.enrollmentDate) {
      payload.enrollmentDate = new Date(dto.enrollmentDate);
    }

    if (dto.schoolId) {
      payload.school = new Types.ObjectId(dto.schoolId);
    }

    if (dto.classId) {
      const classObjectId = new Types.ObjectId(dto.classId);
      payload.class = classObjectId;
      if (!payload.isTrashed) {
        await this.ensureClassCapacity(dto.classId, session);
        await this.incrementClassCount(dto.classId, session);
      }
    }

    return payload;
  }

  private async assignDtoToStudent(
    student: StudentDocument,
    dto: UpdateStudentDto,
    session: ClientSession,
  ): Promise<void> {
    if (dto.name !== undefined) {
      student.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      student.email = dto.email ? dto.email.toLowerCase() : undefined;
    }

    if (dto.phoneNumber !== undefined) {
      student.phoneNumber = dto.phoneNumber;
    }

    if (dto.district !== undefined) {
      student.district = dto.district;
    }

    if (dto.province !== undefined) {
      student.province = dto.province;
    }

    if (dto.gradeLevel !== undefined) {
      student.gradeLevel = dto.gradeLevel;
    }

    if (dto.gender !== undefined) {
      student.gender = dto.gender;
    }

    if (dto.address !== undefined) {
      student.address = dto.address;
    }

    if (dto.previousSchool !== undefined) {
      student.previousSchool = dto.previousSchool;
    }

    if (dto.guardianName !== undefined) {
      student.guardianName = dto.guardianName;
    }

    if (dto.guardianPhoneNumber !== undefined) {
      student.guardianPhoneNumber = dto.guardianPhoneNumber;
    }

    if (dto.guardianEmail !== undefined) {
      student.guardianEmail = dto.guardianEmail
        ? dto.guardianEmail.toLowerCase()
        : undefined;
    }

    if (dto.guardianRelationShip !== undefined) {
      student.guardianRelationShip = dto.guardianRelationShip;
    }

    if (dto.guardianEmergencyContact !== undefined) {
      student.guardianEmergencyContact = dto.guardianEmergencyContact;
    }

    if (dto.medicalInformation !== undefined) {
      student.medicalInformation = dto.medicalInformation;
    }

    if (dto.additionalNotes !== undefined) {
      student.additionalNotes = dto.additionalNotes;
    }

    if (dto.status !== undefined) {
      student.status = dto.status;
    }

    if (dto.dob !== undefined) {
      if (dto.dob) {
        student.dob = new Date(dto.dob);
      } else {
        student.set('dob', undefined);
      }
    }

    if (dto.enrollmentDate !== undefined) {
      if (dto.enrollmentDate) {
        student.enrollmentDate = new Date(dto.enrollmentDate);
      } else {
        student.set('enrollmentDate', undefined);
      }
    }

    if (dto.schoolId !== undefined) {
      if (dto.schoolId) {
        student.school = new Types.ObjectId(dto.schoolId);
      } else {
        student.set('school', undefined);
      }
    }

    if (dto.isTrashed !== undefined) {
      if (dto.isTrashed) {
        await this.applyTrashState(student, session);
      } else {
        await this.applyRestoreState(student);
      }
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'classId')) {
      await this.updateStudentClass(student, dto.classId ?? null, session);
    }
  }

  private async updateStudentClass(
    student: StudentDocument,
    classId: string | null | undefined,
    session: ClientSession,
  ): Promise<void> {
    if (classId === undefined) {
      return;
    }

    const currentClassId = student.class ? student.class.toString() : undefined;

    const normalizedClassId = classId ?? undefined;

    if (normalizedClassId === currentClassId) {
      return;
    }

    if (student.isTrashed && normalizedClassId) {
      throw new BadRequestException(
        'Cannot assign a class to a student that is in the trash',
      );
    }

    if (student.class) {
      await this.decrementClassCount(student.class.toString(), session);
      student.class = undefined;
    }

    if (normalizedClassId) {
      await this.ensureClassCapacity(normalizedClassId, session);
      await this.incrementClassCount(normalizedClassId, session);
      student.class = new Types.ObjectId(normalizedClassId);
    }
  }

  private async ensureClassCapacity(
    classId: string,
    session: ClientSession,
  ): Promise<void> {
    const classDoc = await this.classModel.findById(classId).session(session);

    if (!classDoc) {
      throw new NotFoundException(`Class with id ${classId} not found`);
    }

    if (classDoc.isTrashed) {
      throw new BadRequestException('Cannot assign student to a trashed class');
    }

    if (classDoc.studentCount >= classDoc.capacity) {
      throw new BadRequestException('Class capacity has been reached');
    }
  }

  private async incrementClassCount(
    classId: string,
    session: ClientSession,
  ): Promise<void> {
    await this.classModel
      .updateOne({ _id: classId }, { $inc: { studentCount: 1 } })
      .session(session)
      .exec();
  }

  private async decrementClassCount(
    classId: string,
    session: ClientSession,
  ): Promise<void> {
    await this.classModel
      .updateOne(
        { _id: classId, studentCount: { $gt: 0 } },
        { $inc: { studentCount: -1 } },
      )
      .session(session)
      .exec();
  }

  private async applyTrashState(
    student: StudentDocument,
    session: ClientSession,
  ): Promise<void> {
    if (student.isTrashed) {
      return;
    }

    await this.updateStudentClass(student, null, session);

    student.isTrashed = true;
    student.trashedAt = new Date();
  }

  private async applyRestoreState(student: StudentDocument): Promise<void> {
    if (!student.isTrashed) {
      return;
    }

    student.isTrashed = false;
    student.trashedAt = null;
  }

  private async updateTrashState(id: string, trash: boolean): Promise<Student> {
    const session = await this.studentModel.db.startSession();
    session.startTransaction();

    try {
      const student = await this.studentModel
        .findById(id)
        .session(session)
        .exec();

      if (!student) {
        throw new NotFoundException(`Student with id ${id} not found`);
      }

      if (trash) {
        await this.applyTrashState(student, session);
      } else {
        await this.applyRestoreState(student);
      }

      await student.save({ session });

      await session.commitTransaction();

      return (await this.getStudentById(id)) as Student;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
