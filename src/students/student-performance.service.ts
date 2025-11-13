import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Marks, MarksDocument } from 'src/marks/schemas/marks.schema';

export interface StudentPerformanceFilters {
  academicYear?: string;
  term?: string;
  subjectId?: string;
  classId?: string;
  assessmentId?: string;
  assessmentType?: string;
}

interface SubjectTermBreakdown {
  term: string | null;
  totalScore: number;
  totalMax: number;
  percentage: number | null;
}

export interface SubjectPerformanceSummary {
  subjectId: string | null;
  subjectName: string;
  totalScore: number;
  totalMax: number;
  percentage: number | null;
  terms: SubjectTermBreakdown[];
}

export interface SubjectAssessmentPerformance {
  subject: string;
  scores: Record<string, number | null>;
}

export interface SubjectAssessmentPerformanceFilters {
  term?: string;
  year?: string;
  studentId?: string;
}

export interface StudentAssessmentDetail {
  assessmentId: string;
  assessmentTitle: string;
  subject: string;
  studentId: string | null;
  academicYear: string;
  term: string;
  score: number | null;
  maxScore: number;
  assessmentType: string | null;
  deadline: Date | null;
}

type PopulatedMark = {
  _id: any;
  student: Types.ObjectId;
  subject?: any;
  class?: any;
  assessment?: any;
  assessmentType?: string | null;
  maxScore?: number | null;
  academicYear?: string | null;
  term?: string | null;
  score?: number | null;
  [key: string]: any;
};

@Injectable()
export class StudentPerformanceService {
  constructor(
    @InjectModel(Marks.name)
    private readonly marksModel: Model<MarksDocument>,
  ) {}

  async getStudentPerformanceSummary(
    studentId: string,
    filters: StudentPerformanceFilters = {},
  ): Promise<{
    subjects: SubjectPerformanceSummary[];
    overall: {
      totalScore: number;
      totalMax: number;
      percentage: number | null;
    };
  }> {
    const matchStage = this.buildMatchStage(studentId, filters);

    const marks = await this.findMarks(matchStage, studentId);

    const subjectMap = new Map<
      string,
      {
        subjectId: string | null;
        subjectName: string;
        subjectCode?: string;
        totalScore: number;
        totalMax: number;
        terms: Map<string, { totalScore: number; totalMax: number }>;
      }
    >();

    for (const mark of marks) {
      const { subjectId, subjectName, subjectCode, subjectKey } =
        this.extractSubjectInfo(mark);
      const score = this.toNumber(mark.score) ?? 0;
      const maxScore = this.resolveMaxScore(mark);
      const termKey = mark.term ?? 'Unspecified';

      let subjectAcc = subjectMap.get(subjectKey);
      if (!subjectAcc) {
        subjectAcc = {
          subjectId,
          subjectName,
          subjectCode,
          totalScore: 0,
          totalMax: 0,
          terms: new Map(),
        };
        subjectMap.set(subjectKey, subjectAcc);
      }

      subjectAcc.totalScore += score;
      subjectAcc.totalMax += maxScore;

      const termAcc = subjectAcc.terms.get(termKey) ?? {
        totalScore: 0,
        totalMax: 0,
      };

      termAcc.totalScore += score;
      termAcc.totalMax += maxScore;
      subjectAcc.terms.set(termKey, termAcc);
    }

    let overallScore = 0;
    let overallMax = 0;

    const subjects: SubjectPerformanceSummary[] = Array.from(
      subjectMap.values(),
    )
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
      .map((subject) => {
        overallScore += subject.totalScore;
        overallMax += subject.totalMax;

        const terms: SubjectTermBreakdown[] = Array.from(
          subject.terms.entries(),
        ).map(([term, stats]) => ({
          term,
          totalScore: this.round(stats.totalScore),
          totalMax: this.round(stats.totalMax),
          percentage:
            stats.totalMax > 0
              ? this.round((stats.totalScore / stats.totalMax) * 100)
              : null,
        }));

        return {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          totalScore: this.round(subject.totalScore),
          totalMax: this.round(subject.totalMax),
          percentage:
            subject.totalMax > 0
              ? this.round((subject.totalScore / subject.totalMax) * 100)
              : null,
          terms,
        };
      });

    const overallPercentage =
      overallMax > 0 ? this.round((overallScore / overallMax) * 100) : null;

    return {
      subjects,
      overall: {
        totalScore: this.round(overallScore),
        totalMax: this.round(overallMax),
        percentage: overallPercentage,
      },
    };
  }

  async getSubjectAssessmentPerformances(
    filters: SubjectAssessmentPerformanceFilters = {},
  ): Promise<SubjectAssessmentPerformance[]> {
    const match = this.buildAssessmentFiltersMatch(filters);

    const marks = await this.marksModel
      .find(match)
      .populate([
        {
          path: 'assessment',
          select: 'title AssessmentType maxScore',
        },
        { path: 'subject', select: 'name code' },
      ])
      .lean()
      .exec();

    const subjectMap = new Map<
      string,
      { subject: string; scores: Map<string, number | null> }
    >();

    for (const mark of marks) {
      const { subjectName, subjectKey } = this.extractSubjectInfo(mark);
      const assessmentId = this.extractObjectId(mark.assessment);
      if (!assessmentId) {
        continue;
      }
      const score = this.toNumber(mark.score);

      let subjectEntry = subjectMap.get(subjectKey);
      if (!subjectEntry) {
        subjectEntry = { subject: subjectName, scores: new Map() };
        subjectMap.set(subjectKey, subjectEntry);
      }

      subjectEntry.scores.set(assessmentId, score ?? null);
    }

    return Array.from(subjectMap.values())
      .sort((a, b) => a.subject.localeCompare(b.subject))
      .map((subjectEntry) => ({
        subject: subjectEntry.subject,
        scores: Object.fromEntries(subjectEntry.scores),
      }));
  }

  async getStudentAssessments(
    filters: SubjectAssessmentPerformanceFilters = {},
  ): Promise<StudentAssessmentDetail[]> {
    const match = this.buildAssessmentFiltersMatch(filters);

    const marks = await this.marksModel
      .find(match)
      .populate([
        {
          path: 'assessment',
          select: 'title AssessmentType maxScore deadline',
        },
        { path: 'subject', select: 'name code' },
        { path: 'student', select: '_id' },
      ])
      .lean()
      .exec();

    const details: StudentAssessmentDetail[] = [];

    for (const mark of marks) {
      const assessmentId = this.extractObjectId(mark.assessment);
      if (!assessmentId) {
        continue;
      }

      const { subjectName } = this.extractSubjectInfo(mark);
      const studentId = this.extractObjectId(mark.student);
      const score = this.toNumber(mark.score);

      details.push({
        assessmentId,
        assessmentTitle:
          this.getProp<string>(mark.assessment, 'title') ?? 'Unknown Assessment',
        subject: subjectName,
        studentId,
        academicYear: mark.academicYear ?? '',
        term: mark.term ?? '',
        score: score ?? null,
        maxScore: this.resolveMaxScore(mark),
        assessmentType:
          this.getProp<string>(mark.assessment, 'AssessmentType') ?? null,
        deadline: this.getProp<Date>(mark.assessment, 'deadline'),
      });
    }

    return details.sort((a, b) => {
      const subjectCompare = a.subject.localeCompare(b.subject);
      if (subjectCompare !== 0) return subjectCompare;
      const titleCompare = a.assessmentTitle.localeCompare(b.assessmentTitle);
      if (titleCompare !== 0) return titleCompare;
      const termCompare = a.term.localeCompare(b.term);
      if (termCompare !== 0) return termCompare;
      return a.academicYear.localeCompare(b.academicYear);
    });
  }

  private buildMatchStage(
    studentId: string,
    filters: StudentPerformanceFilters,
  ) {
    const match: Record<string, any> = {
      student: studentId,
    };

    if (filters.subjectId) {
      match.subject = this.toObjectId(filters.subjectId, 'subjectId');
    }

    if (filters.academicYear && filters.academicYear.toLowerCase() !== 'all') {
      match.academicYear = filters.academicYear;
    }

    if (filters.term && filters.term.toLowerCase() !== 'all') {
      match.term = filters.term;
    }

    if (filters.classId) {
      match.class = this.toObjectId(filters.classId, 'classId');
    }

    if (filters.assessmentId) {
      match.assessment = this.toObjectId(filters.assessmentId, 'assessmentId');
    }

    if (filters.assessmentType) {
      match.assessmentType = filters.assessmentType;
    }

    return match;
  }

  private async findMarks(
    match: Record<string, any>,
    studentId: string,
  ): Promise<PopulatedMark[]> {
    return this.marksModel
      .find({ ...match, student: studentId })
      .populate([
        {
          path: 'assessment',
          select: 'title AssessmentType maxScore deadline',
        },
        { path: 'subject', select: 'name code maxScore' },
        { path: 'class', select: 'name' },
      ])
      .lean()
      .exec();
  }

  private extractSubjectInfo(mark: PopulatedMark) {
    const subjectId = this.extractObjectId(mark.subject);
    const subjectName =
      this.getProp<string>(mark.subject, 'name') || 'Unknown Subject';
    const subjectCode = this.getProp<string>(mark.subject, 'code') ?? undefined;
    const subjectKey = subjectId ?? `unknown:${subjectName}`;
    return { subjectId, subjectName, subjectCode, subjectKey };
  }

  private extractObjectId(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Types.ObjectId) return value.toHexString();
    if (typeof value === 'object' && '_id' in (value as any)) {
      const rawId = (value as any)._id;
      if (rawId instanceof Types.ObjectId) return rawId.toHexString();
      if (typeof rawId === 'string') return rawId;
    }
    return null;
  }

  private resolveMaxScore(mark: PopulatedMark): number {
    const candidates = [
      this.toNumber(mark.maxScore),
      this.toNumber(this.getProp<number>(mark.assessment, 'maxScore')),
      this.toNumber(this.getProp<number>(mark.subject, 'maxScore')),
    ];
    for (const candidate of candidates) {
      if (candidate !== null) return candidate;
    }
    return 100;
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getProp<T>(source: unknown, prop: string): T | null {
    if (source && typeof source === 'object' && prop in (source as any)) {
      const result = (source as any)[prop];

      return (result ?? null) as T | null;
    }
    return null;
  }

  private toObjectId(id: string, fieldName: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName}: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private buildAssessmentFiltersMatch(
    filters: SubjectAssessmentPerformanceFilters,
  ) {
    const match: Record<string, any> = {};

    const normalizeAll = (value?: string) =>
      value && value.toLowerCase() === 'all' ? undefined : value;

    const normalizedStudentId = normalizeAll(filters.studentId);
    const normalizedTerm = normalizeAll(filters.term);
    const normalizedYear = normalizeAll(filters.year);

    if (normalizedStudentId) {
      match.student = this.toObjectId(normalizedStudentId, 'studentId');
    }

    if (normalizedTerm) {
      const termVariants = [normalizedTerm];
      if (/^\d+$/.test(normalizedTerm)) {
        termVariants.push(`Term ${normalizedTerm}`, `term ${normalizedTerm}`);
      }

      match.term =
        termVariants.length === 1 ? termVariants[0] : { $in: termVariants };
    }

    if (normalizedYear) {
      const escapedYear = normalizedYear.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.academicYear = normalizedYear.includes('/')
        ? normalizedYear
        : new RegExp(escapedYear, 'i');
    }

    return match;
  }
}
