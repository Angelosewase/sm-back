import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Subject, SubjectDocument } from './schemas/subject.schema';
import {
  SubjectAssignment,
  SubjectAssignmentDocument,
} from './schemas/subject-assignment.schema';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UsersService } from 'src/users/users.service';
import { SchoolModuleService } from '../school-module/school-module.service';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { User } from 'src/users/schemas/user.schema';
import { Class } from 'src/classes/schemas/class.schema';
import { ClassesService } from 'src/classes/classes.service';

interface ResultInterface {
  class?: Class | null;
  subject?: Subject | null;
  teacher?: User | null;
}

interface AssignmentQueryOptions {
  academicYear?: string;
  term?: string;
  populate?: boolean;
}

@Injectable()
export class SubjectService {
  constructor(
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
    @InjectModel(SubjectAssignment.name)
    private subjectAssignmentModel: Model<SubjectAssignmentDocument>,
    private readonly usersService: UsersService,
    private readonly schoolService: SchoolModuleService,
    private readonly classService: ClassesService,
  ) {}

  // ============= ASSIGNMENT METHODS =============

  /**
   * Assign subject to class with optional teacher
   * Checks for duplicate assignments
   */
  async assignSubjectToClass(
    subjectId: string,
    classId: string,
    academicYear: string,
    teacherId?: string,
    term?: string,
    hoursPerWeek?: number,
  ) {
    try {
      // Validate params
      const validationParams: any = { subjectId, classId };
      if (teacherId) validationParams.teacherId = teacherId;

      const {
        subject,
        class: _class,
        teacher,
      } = await this.ValidateParams(validationParams);

      // Check if already assigned
      const existing = await this.checkAssignmentExists(
        subjectId,
        classId,
        academicYear,
        term,
      );

      if (existing) {
        throw new ConflictException(
          `Subject "${subject?.name}" is already assigned to class "${_class?.name}" for ${academicYear}${term ? ` term ${term}` : ''}`,
        );
      }

      // Create assignment
      const assignment = new this.subjectAssignmentModel({
        class: classId,
        subject: subjectId,
        teacher: teacherId || null,
        academicYear,
        term,
        hoursPerWeek,
      });

      const saved = await assignment.save();

      // Populate and return
      return this.subjectAssignmentModel
        .findById(saved._id)
        .populate('class')
        .populate('subject')
        .populate('teacher', '-password')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign subject to teacher (without specific class)
   */
  async assignSubjectToTeacher(
    subjectId: string,
    teacherId: string,
    academicYear: string,
    term?: string,
  ) {
    try {
      const { subject, teacher } = await this.ValidateParams({
        subjectId,
        teacherId,
      });

      // Check if already assigned
      const existing = await this.checkAssignmentExistsWithTeacher(
        subjectId,
        teacherId,
        academicYear,
        term,
      );

      if (existing) {
        throw new ConflictException(
          `Subject "${subject?.name}" is already assigned to class "${teacher?.name}" for ${academicYear}${term ? ` term ${term}` : ''}`,
        );
      }

      if (!subject || !teacher) {
        throw new BadRequestException('Invalid subject or teacher');
      }

      if (teacher.role !== 'teacher') {
        throw new BadRequestException(
          `User with id "${teacherId}" is not a teacher`,
        );
      }

      const rec = new this.subjectAssignmentModel({
        subject: '_id' in subject ? subject._id : subjectId,
        teacher: '_id' in teacher ? teacher._id : teacherId,
        academicYear,
        term,
      });

      const saved = await rec.save();
      return this.subjectAssignmentModel
        .findById(saved._id)
        .populate('subject')
        .populate('teacher', '-password')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Assign subject to class with teacher
   */
  async assignSubjectToClassWithTeacher(
    subjectId: string,
    classId: string,
    teacherId: string,
    academicYear: string,
    term?: string,
    hoursPerWeek?: number,
  ) {
    return this.assignSubjectToClass(
      subjectId,
      classId,
      academicYear,
      teacherId,
      term,
      hoursPerWeek,
    );
  }

  assignMultipleToClasses(
    subjectId: string,
    assignments: {
      classId: string;
      teacherId: string;
      academicYear: string;
      term?: string;
    }[],
  ) {
    try {
      assignments.forEach(async (assignment) => {
        await this.assignSubjectToClass(
          subjectId,
          assignment.classId,
          assignment.academicYear,
          assignment.teacherId,
          assignment.term,
        );
      });
    } catch (error) {
      throw error;
    }
  }
  /**
   * Add co-teacher to existing assignment
   */
  async addCoTeacher(assignmentId: string, coTeacherId: string) {
    try {
      const assignment = await this.subjectAssignmentModel
        .findById(assignmentId)
        .exec();

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Validate teacher
      const teacher = await this.usersService.findById(coTeacherId);
      if (!teacher || teacher.role !== 'teacher') {
        throw new BadRequestException('Invalid teacher');
      }

      // Check if already a co-teacher
      const coTeachers = assignment.coTeacher || [];
      if (coTeachers.some((t) => t.toString() === coTeacherId)) {
        throw new ConflictException('Teacher is already a co-teacher');
      }

      coTeachers.push(new Types.ObjectId(coTeacherId));
      assignment.coTeacher = coTeachers;

      await assignment.save();
      return this.subjectAssignmentModel
        .findById(assignmentId)
        .populate('class')
        .populate('subject')
        .populate('teacher', '-password')
        .populate('coTeacher', '-password')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove co-teacher from assignment
   */
  async removeCoTeacher(assignmentId: string, coTeacherId: string) {
    try {
      const assignment = await this.subjectAssignmentModel
        .findById(assignmentId)
        .exec();

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      const coTeachers = assignment.coTeacher || [];
      assignment.coTeacher = coTeachers.filter(
        (t) => t.toString() !== coTeacherId,
      );

      await assignment.save();
      return this.subjectAssignmentModel
        .findById(assignmentId)
        .populate('class')
        .populate('subject')
        .populate('teacher', '-password')
        .populate('coTeacher', '-password')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update assignment details (teacher, hours, term)
   */
  async updateAssignment(
    assignmentId: string,
    updates: {
      teacherId?: string;
      term?: string;
      hoursPerWeek?: number;
    },
  ) {
    try {
      const assignment = await this.subjectAssignmentModel
        .findById(assignmentId)
        .exec();

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      // Validate teacher if provided
      if (updates.teacherId) {
        const teacher = await this.usersService.findById(updates.teacherId);
        if (!teacher || teacher.role !== 'teacher') {
          throw new BadRequestException('Invalid teacher');
        }
        assignment.teacher = new Types.ObjectId(updates.teacherId);
      }

      if (updates.term !== undefined) assignment.term = updates.term;
      if (updates.hoursPerWeek !== undefined)
        assignment.hoursPerWeek = updates.hoursPerWeek;

      await assignment.save();
      return this.subjectAssignmentModel
        .findById(assignmentId)
        .populate('class')
        .populate('subject')
        .populate('teacher', '-password')
        .populate('coTeacher', '-password')
        .exec();
    } catch (error) {
      throw error;
    }
  }

  // ============= REMOVAL/DEASSIGNMENT METHODS =============

  /**
   * Remove subject from class (delete assignment)
   */
  async removeSubjectFromClass(
    subjectId: string,
    classId: string,
    academicYear: string,
    term?: string,
  ) {
    try {
      const filter: any = {
        subject: subjectId,
        class: classId,
        academicYear,
      };
      if (term) filter.term = term;

      const result = await this.subjectAssignmentModel
        .findOneAndDelete(filter)
        .exec();

      if (!result) {
        throw new NotFoundException('Assignment not found');
      }

      return {
        message: 'Subject successfully removed from class',
        deletedAssignment: result,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete assignment by ID
   */
  async deleteAssignment(assignmentId: string) {
    try {
      const result = await this.subjectAssignmentModel
        .findByIdAndDelete(assignmentId)
        .exec();

      if (!result) {
        throw new NotFoundException('Assignment not found');
      }

      return {
        message: 'Assignment successfully deleted',
        deletedAssignment: result,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove all assignments for a class
   */
  async removeAllSubjectsFromClass(classId: string, academicYear?: string) {
    try {
      const filter: any = { class: classId };
      if (academicYear) filter.academicYear = academicYear;

      const result = await this.subjectAssignmentModel
        .deleteMany(filter)
        .exec();

      return {
        message: `Successfully removed ${result.deletedCount} subject(s) from class`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove all assignments for a subject
   */
  async removeSubjectFromAllClasses(subjectId: string, academicYear?: string) {
    try {
      const filter: any = { subject: subjectId };
      if (academicYear) filter.academicYear = academicYear;

      const result = await this.subjectAssignmentModel
        .deleteMany(filter)
        .exec();

      return {
        message: `Successfully removed subject from ${result.deletedCount} class(es)`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove teacher from all assignments
   */
  async removeTeacherFromAllAssignments(
    teacherId: string,
    academicYear?: string,
  ) {
    try {
      const filter: any = { teacher: teacherId };
      if (academicYear) filter.academicYear = academicYear;

      const result = await this.subjectAssignmentModel
        .updateMany(filter, { $unset: { teacher: 1 } })
        .exec();

      return {
        message: `Successfully removed teacher from ${result.modifiedCount} assignment(s)`,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      throw error;
    }
  }

  // ============= FETCH/QUERY METHODS =============

  /**
   * Get all subjects assigned to a class
   */
  async getClassSubjects(
    classId: string,
    options: AssignmentQueryOptions = {},
  ) {
    try {
      const filter: any = { class: classId };
      if (options.academicYear) filter.academicYear = options.academicYear;
      if (options.term) filter.term = options.term;

      let query = this.subjectAssignmentModel.find(filter);

      if (options.populate !== false) {
        query = query
          .populate('subject')
          .populate('teacher', '-password')
          .populate('coTeacher', '-password');
      }

      const assignments = await query.exec();

      return {
        classId,
        totalSubjects: assignments.length,
        assignments,
        subjects: assignments.map((a) => a.subject),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all classes where a subject is assigned
   */
  async getSubjectClasses_Teachers_Students(
    subjectId: string,
    options: AssignmentQueryOptions = {},
  ) {
    try {
      // Validate subject exists first
      const subject = await this.getSubjectById(subjectId);
      if (!subject) {
        throw new NotFoundException(`Subject with id "${subjectId}" not found`);
      }

      // Set up filter with proper ObjectId conversion
      const filter: any = {
        subject: new Types.ObjectId(subjectId),
      };

      if (options.academicYear) filter.academicYear = options.academicYear;
      if (options.term) filter.term = options.term;

      let query = this.subjectAssignmentModel.find(filter);

      // Always populate all fields except sensitive data
      if (options.populate !== false) {
        query = query
          .populate({
            path: 'class',
            select:
              '_id name code academicYear level program stream capacity description formTeacher status room',
          })
          .populate({
            path: 'teacher',
            select: '-password',
          })
          .populate({
            path: 'coTeacher',
            select: '-password',
          })
          .populate('subject');
      }

      const assignments = await query.lean().exec();
      console.log(
        `Found ${assignments.length} assignments for subject ${subjectId}`,
      );

      // Filter out any null/undefined classes when mapping
      const classes = assignments.map((a) => a.class).filter(Boolean);
      // const students = assignments.map(a=> a.students).filter(Boolean);
      const uniqueTeachers = Array.from(
        new Set(
          assignments.map((a) => a.teacher?._id?.toString()).filter(Boolean),
        ),
      )
        .map(
          (id) =>
            assignments.find((a) => a.teacher?._id?.toString() === id)?.teacher,
        )
        .filter(Boolean);
      return {
        subjectId,
        totalTeachers: uniqueTeachers.length,
        totalClasses: classes.length,
        assignments,
        classes,
        uniqueTeachers,
        debug: {
          filter,
          matchedAssignments: assignments.length,
        },
      };
    } catch (error) {
      console.error('Error in getSubjectClasses:', error);
      throw error;
    }
  }

  /**
   * Get all subjects assigned to a teacher
   */
  async getTeacherSubjects(
    teacherId: string,
    options: AssignmentQueryOptions = {},
  ) {
    try {
      const filter: any = {
        $or: [{ teacher: teacherId }, { coTeacher: teacherId }],
      };
      if (options.academicYear) filter.academicYear = options.academicYear;
      if (options.term) filter.term = options.term;

      let query = this.subjectAssignmentModel.find(filter);

      if (options.populate !== false) {
        query = query
          .populate('subject')
          .populate('class')
          .populate('teacher', '-password')
          .populate('coTeacher', '-password');
      }

      const assignments = await query.exec();

      // Get unique subjects
      const subjectMap = new Map();
      assignments.forEach((a) => {
        if (a.subject && '_id' in a.subject) {
          subjectMap.set(a.subject._id.toString(), a.subject);
        }
      });

      return {
        teacherId,
        totalAssignments: assignments.length,
        totalUniqueSubjects: subjectMap.size,
        assignments,
        subjects: Array.from(subjectMap.values()),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all classes assigned to a teacher
   */
  async getTeacherClasses(
    teacherId: string,
    options: AssignmentQueryOptions = {},
  ) {
    try {
      const filter: any = {
        $or: [{ teacher: teacherId }, { coTeacher: teacherId }],
      };
      if (options.academicYear) filter.academicYear = options.academicYear;
      if (options.term) filter.term = options.term;

      let query = this.subjectAssignmentModel.find(filter);

      if (options.populate !== false) {
        query = query
          .populate('class')
          .populate('subject')
          .populate('teacher', '-password')
          .populate('coTeacher', '-password');
      }

      const assignments = await query.exec();

      // Get unique classes
      const classMap = new Map();
      assignments.forEach((a) => {
        if (a.class && '_id' in a.class) {
          classMap.set(a.class._id.toString(), a.class);
        }
      });

      return {
        teacherId,
        totalAssignments: assignments.length,
        totalUniqueClasses: classMap.size,
        assignments,
        classes: Array.from(classMap.values()),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get teacher's complete schedule (classes + subjects)
   */
  async getTeacherSchedule(
    teacherId: string,
    academicYear: string,
    term?: string,
  ) {
    try {
      const filter: any = {
        $or: [{ teacher: teacherId }, { coTeacher: teacherId }],
        academicYear,
      };
      if (term) filter.term = term;

      const assignments = await this.subjectAssignmentModel
        .find(filter)
        .populate('class')
        .populate('subject')
        .populate('teacher', '-password')
        .populate('coTeacher', '-password')
        .exec();

      // Group by class
      const byClass = new Map();
      assignments.forEach((a) => {
        if (a.class && '_id' in a.class) {
          const classId = a.class._id.toString();
          if (!byClass.has(classId)) {
            byClass.set(classId, {
              class: a.class,
              subjects: [],
            });
          }
          byClass.get(classId).subjects.push(a);
        }
      });

      const totalHours = assignments.reduce(
        (sum, a) => sum + (a.hoursPerWeek || 0),
        0,
      );

      return {
        teacherId,
        academicYear,
        term,
        totalAssignments: assignments.length,
        totalClasses: byClass.size,
        totalWeeklyHours: totalHours,
        assignmentsByClass: Array.from(byClass.values()),
        allAssignments: assignments,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get single assignment with full details
   */
  async getAssignmentById(assignmentId: string) {
    try {
      const assignment = await this.subjectAssignmentModel
        .findById(assignmentId)
        .populate('class')
        .populate('subject')
        .populate('teacher', '-password')
        .populate('coTeacher', '-password')
        .exec();

      if (!assignment) {
        throw new NotFoundException('Assignment not found');
      }

      return assignment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search/filter assignments with pagination
   */
  async findAssignments(query: {
    classId?: string;
    subjectId?: string;
    teacherId?: string;
    academicYear?: string;
    term?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        classId,
        subjectId,
        teacherId,
        academicYear,
        term,
        page = 1,
        limit = 20,
      } = query;

      const filter: any = {};
      if (classId) filter.class = classId;
      if (subjectId) filter.subject = subjectId;
      if (teacherId) {
        filter.$or = [{ teacher: teacherId }, { coTeacher: teacherId }];
      }
      if (academicYear) filter.academicYear = academicYear;
      if (term) filter.term = term;

      const skip = (page - 1) * limit;

      const [assignments, total] = await Promise.all([
        this.subjectAssignmentModel
          .find(filter)
          .populate('class')
          .populate('subject')
          .populate('teacher', '-password')
          .populate('coTeacher', '-password')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .exec(),
        this.subjectAssignmentModel.countDocuments(filter).exec(),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        assignments,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // ============= ANALYTICS METHODS =============

  /**
   * Get assignment statistics for a school
   */
  async getSchoolAssignmentStats(schoolId: string, academicYear?: string) {
    try {
      const filter: any = {};
      if (academicYear) filter.academicYear = academicYear;

      // Get all classes for this school
      const classes = await this.classService.findAll({
        school: schoolId,
        academicYear,
      });
      const classIds = classes.data.map((c) => (c as any)._id.toString());

      filter.class = { $in: classIds };

      const [
        totalAssignments,
        assignmentsWithTeachers,
        assignmentsWithoutTeachers,
        uniqueSubjects,
        uniqueTeachers,
      ] = await Promise.all([
        this.subjectAssignmentModel.countDocuments(filter).exec(),
        this.subjectAssignmentModel
          .countDocuments({ ...filter, teacher: { $exists: true, $ne: null } })
          .exec(),
        this.subjectAssignmentModel
          .countDocuments({
            ...filter,
            $or: [{ teacher: { $exists: false } }, { teacher: null }],
          })
          .exec(),
        this.subjectAssignmentModel.distinct('subject', filter).exec(),
        this.subjectAssignmentModel.distinct('teacher', filter).exec(),
      ]);

      return {
        schoolId,
        academicYear,
        totalClasses: classes.total,
        totalAssignments,
        assignmentsWithTeachers,
        assignmentsWithoutTeachers,
        uniqueSubjectsAssigned: uniqueSubjects.length,
        uniqueTeachersAssigned: uniqueTeachers.filter((t) => t).length,
        averageSubjectsPerClass:
          classes.total > 0 ? (totalAssignments / classes.total).toFixed(2) : 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get teacher workload analytics
   */
  async getTeacherWorkload(teacherId: string, academicYear?: string) {
    try {
      const filter: any = {
        $or: [{ teacher: teacherId }, { coTeacher: teacherId }],
      };
      if (academicYear) filter.academicYear = academicYear;

      const assignments = await this.subjectAssignmentModel
        .find(filter)
        .populate('class')
        .populate('subject')
        .exec();

      const uniqueClasses = new Set();
      const uniqueSubjects = new Set();
      let totalHours = 0;
      let primaryAssignments = 0;
      let coTeacherAssignments = 0;

      assignments.forEach((a) => {
        if (a.class) uniqueClasses.add(a.class._id.toString());
        if (a.subject) uniqueSubjects.add(a.subject._id.toString());
        totalHours += a.hoursPerWeek || 0;

        if (a.teacher?.toString() === teacherId) {
          primaryAssignments++;
        } else {
          coTeacherAssignments++;
        }
      });

      return {
        teacherId,
        academicYear,
        totalAssignments: assignments.length,
        primaryAssignments,
        coTeacherAssignments,
        uniqueClasses: uniqueClasses.size,
        uniqueSubjects: uniqueSubjects.size,
        totalWeeklyHours: totalHours,
        averageHoursPerClass:
          uniqueClasses.size > 0
            ? (totalHours / uniqueClasses.size).toFixed(2)
            : 0,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get class subject coverage analytics
   */
  async getClassCoverage(classId: string, academicYear: string) {
    try {
      const assignments = await this.subjectAssignmentModel
        .find({ class: classId, academicYear })
        .populate('subject')
        .populate('teacher', '-password')
        .exec();

      const totalSubjects = assignments.length;
      const subjectsWithTeachers = assignments.filter((a) => a.teacher).length;
      const subjectsWithoutTeachers = totalSubjects - subjectsWithTeachers;

      const byType: Record<string, number> = {};
      assignments.forEach((a) => {
        if (a.subject && 'subjectType' in a.subject) {
          const type = a.subject.subjectType || 'unknown';
          byType[type as any] = (byType[type as any] || 0) + 1;
        }
      });

      const totalHours = assignments.reduce(
        (sum, a) => sum + (a.hoursPerWeek || 0),
        0,
      );

      return {
        classId,
        academicYear,
        totalSubjects,
        subjectsWithTeachers,
        subjectsWithoutTeachers,
        coveragePercentage:
          totalSubjects > 0
            ? ((subjectsWithTeachers / totalSubjects) * 100).toFixed(2)
            : 0,
        subjectsByType: byType,
        totalWeeklyHours: totalHours,
      };
    } catch (error) {
      throw error;
    }
  }

  // ============= HELPER METHODS =============

  /**
   * Check if assignment already exists  subject-> class in same academic year
   */
  async checkAssignmentExists(
    subjectId: string,
    classId: string,
    academicYear: string,
    term?: string,
  ): Promise<boolean> {
    const filter: any = {
      subject: subjectId,
      class: classId,
      academicYear,
    };
    if (term) filter.term = term;

    const count = await this.subjectAssignmentModel
      .countDocuments(filter)
      .exec();
    return count > 0;
  }

  /**
   * Check if assignment already exists  subject-> teacher in same academic year
   */
  async checkAssignmentExistsWithTeacher(
    subjectId: string,
    teacherId: string,
    academicYear: string,
    term?: string,
  ): Promise<boolean> {
    const filter: any = {
      subject: new Types.ObjectId(subjectId),
      teacher: new Types.ObjectId(teacherId),
      academicYear,
    };
    if (term) filter.term = term;

    const count = await this.subjectAssignmentModel
      .countDocuments(filter)
      .exec();
    console.log('the filter was: ', filter);
    console.log('output count is: ', count);
    return count > 0;
  }

  /**
   * Validate params helper
   */
  async ValidateParams({
    subjectId,
    classId,
    teacherId,
  }: {
    subjectId: string;
    classId?: string;
    teacherId?: string;
  }): Promise<ResultInterface> {
    const result: ResultInterface = {};

    const subject_ = await this.getSubjectById(subjectId);
    if (!subject_) {
      throw new NotFoundException(`Subject with id "${subjectId}" not found`);
    }
    result.subject = subject_;

    if (classId) {
      const class_ = await this.classService.findOne(classId);
      if (!class_) {
        throw new NotFoundException(`Class with id "${classId}" not found`);
      }
      result.class = class_;
    }

    if (teacherId) {
      const teacher_ = await this.usersService.findById(teacherId);
      if (!teacher_) {
        throw new NotFoundException(`Teacher with id "${teacherId}" not found`);
      }
      if (teacher_.role !== 'teacher') {
        throw new BadRequestException(
          `User with id "${teacherId}" is not a teacher`,
        );
      }
      result.teacher = teacher_;
    }

    return result;
  }

  // ============= EXISTING METHODS (kept from original) =============

  async createSubject(dto: CreateSubjectDto) {
    const payload: any = { ...dto };
    if ((dto as any).subjectName) {
      payload.name = (dto as any).subjectName;
      delete payload.subjectName;
    }
    if ((dto as any).subjectCode) {
      payload.code = (dto as any).subjectCode;
      delete payload.subjectCode;
    }
    if ((dto as any).category) {
      payload.subjectType = (dto as any).category;
      delete payload.category;
    }
    if ((dto as any).gradeLevel && !(dto as any).gradeLevels) {
      payload.gradeLevels = [(dto as any).gradeLevel];
      delete payload.gradeLevel;
    }

    if (payload.school) {
      const school_ = await this.schoolService.findOne(payload.school);
      if (!school_)
        throw new NotFoundException(
          `School with id "${payload.school}" not found`,
        );
    }

    if (payload.code) {
      const subjectWithcode_ = await this.subjectModel
        .findOne({ code: payload.code })
        .exec();
      if (subjectWithcode_)
        throw new BadRequestException(
          `Subject with code "${payload.code}" already exists`,
        );
    }

    const s = new this.subjectModel(payload);
    const saved = await s.save();
    const obj = (saved as any).toObject ? (saved as any).toObject() : saved;
    obj.subjectName = obj.name;
    obj.subjectCode = obj.code;
    return obj;
  }

  async listSubjects(filter: any = {}) {
    return this.subjectModel.find(filter).exec();
  }

  async findAll(query: QuerySubjectDto) {
    const {
      q,
      subjectType,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      gradeLevel,
    } = query;

    const filter: FilterQuery<Subject> = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { location: regex },
        { address: regex },
        { contactEmail: regex },
        { subjectType: regex },
      ];
    }
    if (subjectType) {
      filter.subjectType = subjectType;
    } else if (gradeLevel) {
      filter.gradeLevels = gradeLevel;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      this.subjectModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
      this.subjectModel.countDocuments(filter).exec(),
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

  getSubjectById(id: string) {
    return this.subjectModel.findById(id).exec();
  }

  async updateSubject(id: string, dto: UpdateSubjectDto) {
    try {
      const subject_ = await this.subjectModel.findById(id).exec();
      if (!subject_)
        throw new NotFoundException(`Subject with id "${id}" not found`);

      const payload: any = { ...dto };
      if ((dto as any).subjectName) {
        payload.name = (dto as any).subjectName;
        delete payload.subjectName;
      }
      if ((dto as any).subjectCode) {
        payload.code = (dto as any).subjectCode;
        delete payload.subjectCode;
      }
      if ((dto as any).category) {
        payload.subjectType = (dto as any).category;
        delete payload.category;
      }
      if ((dto as any).gradeLevel && !(dto as any).gradeLevels) {
        payload.gradeLevels = [(dto as any).gradeLevel];
        delete payload.gradeLevel;
      }

      if (payload.school) {
        const school_ = await this.schoolService.findOne(payload.school);
        if (!school_)
          throw new NotFoundException(
            `School with id "${payload.school}" not found`,
          );
      }

      const updated = await this.subjectModel
        .findByIdAndUpdate(id, payload, { new: true })
        .exec();
      const obj = (updated as any)?.toObject
        ? (updated as any).toObject()
        : updated;
      if (obj) {
        obj.subjectName = obj.name;
        obj.subjectCode = obj.code;
      }
      return obj;
    } catch (error) {
      throw error;
    }
  }

  async findSubjectByCode(code?: string): Promise<Subject> {
    const _sub = await this.subjectModel.findOne({ code }).exec();
    if (_sub) return _sub;
    throw new NotFoundException(`Subject with code "${code}" not found`);
  }

  async deleteSubject(id: string) {
    return this.subjectModel.findByIdAndDelete(id).exec();
  }

  async getAllAssignments(options: AssignmentQueryOptions = {}) {
    try {
      const filter: any = {};
      // if (options.academicYear) filter.academicYear = options.academicYear;
      // if (options.term) filter.term = options.term;

      let query = this.subjectAssignmentModel.find(filter);

      if (options.populate !== false) {
        query = query
          .populate('subject')
          .populate('class')
          .populate('teacher', '-password')
          .populate('coTeacher', '-password');
      }

      const assignments = await query.exec();

      return {
        totalAssignments: assignments.length,
        assignments,
      };
    } catch (error) {
      console.error('Error in getAllAssignments:', error);
      throw error;
    }
  }
}
