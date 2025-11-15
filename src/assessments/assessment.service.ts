import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AssessmentFilterDto } from './dto/assessment-filter-dto';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import {
  Assessment,
  AssessmentStatus,
  AssessmentDocument,
} from './schemas/assessment-schema';
import { Marks, MarksDocument } from '../marks/schemas/marks.schema';
import { Subject, SubjectDocument } from '../subjects/schemas/subject.schema';
import { Class, ClassDocument } from 'src/classes/schemas/class.schema';
import { Term, TermDocument } from 'src/terms/schemas/term.schema';
import {
  AcademicYear,
  AcademicYearDocument,
} from 'src/academic-year/schemas/academic-year.schema';

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    @InjectModel(Assessment.name)
    private assessmentModel: Model<AssessmentDocument>,
    @InjectModel(Marks.name) private marksModel: Model<MarksDocument>,
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    @InjectModel(AcademicYear.name)
    private academicYearModel: Model<AcademicYearDocument>,
    @InjectModel(Term.name) private termModel: Model<TermDocument>,
    @InjectModel(Subject.name) private subjectModel: Model<SubjectDocument>,
  ) {}

  async create(dto: CreateAssessmentDto): Promise<Assessment> {
    const [academicYear, term, subject, cls] = await Promise.all([
      this.academicYearModel.findById(dto.academicYear),
      this.termModel.findById(dto.term),
      this.subjectModel.findById(dto.subject),
      this.classModel.findById(dto.class),
    ]);

    // Throw with clear messages for missing
    if (!academicYear) {
      this.logger.warn(`Invalid academicYear: ${dto.academicYear}`);
      throw new BadRequestException('Academic year does not exist');
    }
    if (!term) {
      this.logger.warn(`Invalid term: ${dto.term}`);
      throw new BadRequestException('Term does not exist');
    }
    if (!subject) {
      this.logger.warn(`Invalid subject: ${dto.subject}`);
      throw new BadRequestException('Subject does not exist');
    }
    if (!cls) {
      this.logger.warn(`Invalid class: ${dto.class}`);
      throw new BadRequestException('Class does not exist');
    }

    try {
      const created = await this.assessmentModel.create(dto);

      await this.subjectModel.updateOne(
        { _id: dto.subject },
        {
          $inc: { assessmentsCount: 1 },
          $addToSet: { assessments: created._id },
        },
      );
      return created;
    } catch (error) {
      this.logger.error('Failed to create assessment', error as any);
      throw new InternalServerErrorException('Failed to create assessment');
    }
  }

  async update(
    id: string,
    dto: UpdateAssessmentDto,
  ): Promise<Assessment | null> {
    try {
      const updated = await this.assessmentModel
        .findByIdAndUpdate(id, dto, { new: true })
        .exec();
      if (!updated) throw new NotFoundException('Assessment not found');
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update assessment ${id}`, error as any);
      throw new InternalServerErrorException('Failed to update assessment');
    }
  }

  async findAll(filter: AssessmentFilterDto) {
    try {
      const query: any = {};
      if (filter.academicYear) query.academicYear = filter.academicYear;
      if (filter.term) query.term = filter.term;
      if (filter.subject) query.subject = filter.subject;
      if (filter.class) query.class = filter.class;
      if (filter.status) query.status = filter.status;
      if (filter.assessmentType) query.assessmentType = filter.assessmentType;
      if (filter.deadlineStart || filter.deadlineEnd) {
        query.deadline = {};
        if (filter.deadlineStart)
          query.deadline.$gte = new Date(filter.deadlineStart);
        if (filter.deadlineEnd)
          query.deadline.$lte = new Date(filter.deadlineEnd);
      }
      const skip = ((filter.page ?? 1) - 1) * (filter.pageSize ?? 10);
      const limit = filter.pageSize ?? 10;
      const [assessments, total] = await Promise.all([
        this.assessmentModel
          .find(query)
          .skip(skip)
          .limit(limit)
          .populate(['subject', 'class', 'academicYear', 'term'])
          .exec(),
        this.assessmentModel.countDocuments(query).exec(),
      ]);

      return {
        data: assessments,
        total,
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 10,
      };
    } catch (error) {
      this.logger.error('Failed to fetch assessments', error as any);
      throw new InternalServerErrorException('Failed to fetch assessments');
    }
  }

  async findOne(id: string): Promise<Assessment | null> {
    try {
      const assessment = await this.assessmentModel
        .findById(id)
        .populate([
          'subject',
          'academicYear',
          'term',
          {
            path: 'class',
            populate: {
              path: 'students',
              model: 'Student',
              match: { isTrashed: false },
              select: 'studentId name email phoneNumber gradeLevel status',
            },
          },
        ])
        .exec();
      if (!assessment) throw new NotFoundException('Assessment not found');
      return assessment;
    } catch (error) {
      this.logger.error(`Failed to fetch assessment ${id}`, error as any);
      throw new InternalServerErrorException('Failed to fetch assessment');
    }
  }

  async softDelete(id: string) {
    try {
      const updated = await this.assessmentModel
        .findByIdAndUpdate(
          id,
          { status: AssessmentStatus.TRASHED },
          { new: true },
        )
        .exec();
      if (!updated) throw new NotFoundException('Assessment not found');
      return updated;
    } catch (error) {
      this.logger.error(`Failed to soft-delete assessment ${id}`, error as any);
      throw new InternalServerErrorException('Failed to delete assessment');
    }
  }

  async permanentlyDelete(id: string) {
    try {
      const deleted = await this.assessmentModel.findByIdAndDelete(id).exec();
      if (!deleted) throw new NotFoundException('Assessment not found');
      // Optionally remove marks references; here we remove marks that directly reference this assessment if present
      if (
        deleted.marks &&
        Array.isArray(deleted.marks) &&
        deleted.marks.length
      ) {
        await this.marksModel
          .deleteMany({ _id: { $in: deleted.marks } })
          .exec();
      }
      return deleted;
    } catch (error) {
      this.logger.error(
        `Failed to permanently delete assessment ${id}`,
        error as any,
      );
      throw new InternalServerErrorException(
        'Failed to permanently delete assessment',
      );
    }
  }

  // Analytics: Get current submissions & performance for assessment
  async getPerformance(id: string) {
    try {
      const assessment = await this.assessmentModel.findById(id).exec();
      if (!assessment) throw new NotFoundException('Assessment not found');

      // Build mark filter: prefer explicit marks array on assessment, otherwise match by subject/class/assessmentType
      const markFilter: any = {};
      if (
        assessment.marks &&
        Array.isArray(assessment.marks) &&
        assessment.marks.length
      ) {
        markFilter._id = { $in: assessment.marks };
      } else {
        if (assessment.subject) markFilter.subject = assessment.subject;
        if (assessment.class) markFilter.class = assessment.class;
        if ((assessment as any).AssessmentType)
          markFilter.assessmentType = (assessment as any).AssessmentType;
        if (assessment.academicYear)
          markFilter.academicYear = assessment.academicYear;
      }

      const agg = await this.marksModel
        .aggregate([
          { $match: markFilter },
          {
            $group: {
              _id: null,
              submissionsCount: { $sum: 1 },
              gradedCount: {
                $sum: { $cond: [{ $ifNull: ['$score', false] }, 1, 0] },
              },
              avgScore: { $avg: '$score' },
              maxScore: { $max: '$score' },
              minScore: { $min: '$score' },
            },
          },
        ])
        .exec();

      const stats = agg[0] || {
        submissionsCount: 0,
        gradedCount: 0,
        avgScore: null,
        maxScore: null,
        minScore: null,
      };

      return {
        assessmentId: id,
        submissionsCount: stats.submissionsCount,
        gradedCount: stats.gradedCount,
        avgScore: stats.avgScore,
        maxScore: stats.maxScore,
        minScore: stats.minScore,
      };
    } catch (error) {
      this.logger.error(
        `Failed to compute performance for assessment ${id}`,
        error as any,
      );
      throw new InternalServerErrorException(
        'Failed to compute assessment performance',
      );
    }
  }

  // Subject/class analytics
  async getSubjectPerformance(
    subjectId: string,
    academicYear?: string,
    term?: string,
    classId?: string,
  ) {
    try {
      const match: any = { subject: new Types.ObjectId(subjectId) };
      if (academicYear) match.academicYear = academicYear;
      if (term) match.term = term;
      if (classId) match.class = new Types.ObjectId(classId);

      // Aggregate marks grouped by assessmentType and overall
      const agg = await this.marksModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$assessmentType',
              submissions: { $sum: 1 },
              avgScore: { $avg: '$score' },
            },
          },
        ])
        .exec();

      // Overall stats
      const overall = await this.marksModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              submissions: { $sum: 1 },
              avgScore: { $avg: '$score' },
              maxScore: { $max: '$score' },
              minScore: { $min: '$score' },
            },
          },
        ])
        .exec();

      return {
        subjectId,
        academicYear,
        term,
        byAssessmentType: agg,
        overall: overall[0] || {
          submissions: 0,
          avgScore: null,
          maxScore: null,
          minScore: null,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to compute subject performance for ${subjectId}`,
        error as any,
      );
      throw new InternalServerErrorException(
        'Failed to compute subject performance',
      );
    }
  }

  async getClassPerformance(
    classId: string,
    academicYear?: string,
    term?: string,
  ) {
    try {
      const match: any = { class: new Types.ObjectId(classId) };
      if (academicYear) match.academicYear = academicYear;
      if (term) match.term = term;

      const agg = await this.marksModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: '$subject',
              submissions: { $sum: 1 },
              avgScore: { $avg: '$score' },
            },
          },
        ])
        .exec();

      const overall = await this.marksModel
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              submissions: { $sum: 1 },
              avgScore: { $avg: '$score' },
              maxScore: { $max: '$score' },
              minScore: { $min: '$score' },
            },
          },
        ])
        .exec();

      return {
        classId,
        academicYear,
        term,
        bySubject: agg,
        overall: overall[0] || {
          submissions: 0,
          avgScore: null,
          maxScore: null,
          minScore: null,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to compute class performance for ${classId}`,
        error as any,
      );
      throw new InternalServerErrorException(
        'Failed to compute class performance',
      );
    }
  }
}
