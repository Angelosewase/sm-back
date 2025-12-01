import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Marks, MarksDocument } from 'src/marks/schemas/marks.schema';
import {
  AcademicYear,
  AcademicYearDocument,
} from 'src/academic-year/schemas/academic-year.schema';
import { Term, TermDocument } from 'src/terms/schemas/term.schema';

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
  termId?: string;
  academicYearId?: string;
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
  academicYear?: Types.ObjectId | null;
  term?: Types.ObjectId | null;
  score?: number | null;
  [key: string]: any;
};

@Injectable()
export class StudentPerformanceService {
  constructor(
    @InjectModel(Marks.name)
    private readonly marksModel: Model<MarksDocument>,
    @InjectModel(AcademicYear.name)
    private readonly academicYearModel: Model<AcademicYearDocument>,
    @InjectModel(Term.name)
    private readonly termModel: Model<TermDocument>,
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
        subjectScaleMax: number;
        weightedSum: number; // sum of (score/max) * weight
        totalWeight: number; // sum of weights
        terms: Map<
          string,
          { weightedSum: number; totalWeight: number; subjectScaleMax: number }
        >;
      }
    >();

    for (const mark of marks) {
      const { subjectId, subjectName, subjectCode, subjectKey } =
        this.extractSubjectInfo(mark);
      const score = this.toNumber(mark.score) ?? 0;
      const assessmentMax = this.resolveMaxScore(mark);
      const subjectScaleMax = this.resolveSubjectScaleMax(mark);
      const weight = this.resolveAssessmentWeight(mark);
      const termKey = mark.term ?? 'Unspecified';

      let subjectAcc = subjectMap.get(subjectKey);
      if (!subjectAcc) {
        subjectAcc = {
          subjectId,
          subjectName,
          subjectCode,
          subjectScaleMax,
          weightedSum: 0,
          totalWeight: 0,
          terms: new Map(),
        };
        subjectMap.set(subjectKey, subjectAcc);
      }

      const normalized = assessmentMax > 0 ? score / assessmentMax : 0;
      subjectAcc.weightedSum += normalized * weight;
      subjectAcc.totalWeight += weight;

      const termAcc =
        subjectAcc.terms.get(termKey.toString()) ?? {
          weightedSum: 0,
          totalWeight: 0,
          subjectScaleMax,
        };

      termAcc.weightedSum += normalized * weight;
      termAcc.totalWeight += weight;
      subjectAcc.terms.set(termKey.toString(), termAcc);
    }

    let overallScore = 0;
    let overallMax = 0;

    const subjects: SubjectPerformanceSummary[] = Array.from(
      subjectMap.values(),
    )
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
      .map((subject) => {
        const subjectWeightedAvg =
          subject.totalWeight > 0 ? subject.weightedSum / subject.totalWeight : 0;
        const subjectScaledScore = this.round(
          subjectWeightedAvg * subject.subjectScaleMax,
        );
        const subjectScaledMax = this.round(subject.subjectScaleMax);

        overallScore += subjectScaledScore;
        overallMax += subjectScaledMax;

        const terms: SubjectTermBreakdown[] = Array.from(
          subject.terms.entries(),
        ).map(([term, stats]) => {
          const termWeightedAvg =
            stats.totalWeight > 0 ? stats.weightedSum / stats.totalWeight : 0;
          const termScaledScore = this.round(termWeightedAvg * stats.subjectScaleMax);
          const termScaledMax = this.round(stats.subjectScaleMax);
          return {
            term,
            totalScore: termScaledScore,
            totalMax: termScaledMax,
            percentage:
              stats.totalWeight > 0 ? this.round(termWeightedAvg * 100) : null,
          };
        });

        return {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          totalScore: subjectScaledScore,
          totalMax: subjectScaledMax,
          percentage: subject.totalWeight > 0 ? this.round(subjectWeightedAvg * 100) : null,
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
    const match = await this.buildAssessmentFiltersMatch(filters);

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
    const match = await this.buildAssessmentFiltersMatch(filters);

    const marks = await this.marksModel
      .find(match)
      .populate([
        {
          path: 'assessment',
          select: 'title AssessmentType maxScore deadline academicYear term',
          populate: [
            { path: 'academicYear', select: 'label' },
            { path: 'term', select: 'name' },
          ],
        },
        { path: 'subject', select: 'name code' },
        { path: 'student', select: '_id' },
      ])
      .lean()
      .exec();

    const { termNameById, academicYearLabelById } =
      await this.resolveTermAndAcademicYearNames(marks);

    const details: StudentAssessmentDetail[] = [];

    for (const mark of marks) {
      const assessmentId = this.extractObjectId(mark.assessment);
      if (!assessmentId) {
        continue;
      }

      const { subjectName } = this.extractSubjectInfo(mark);
      const studentId = this.extractObjectId(mark.student);
      const score = this.toNumber(mark.score);
      const rawTerm =
        mark.term ?? this.getProp<any>(mark.assessment, 'term') ?? null;
      const rawAcademicYear =
        mark.academicYear ??
        this.getProp<any>(mark.assessment, 'academicYear') ??
        null;

      details.push({
        assessmentId,
        assessmentTitle:
          this.getProp<string>(mark.assessment, 'title') ??
          'Unknown Assessment',
        subject: subjectName,
        studentId,
        academicYear: this.resolveAcademicYearLabel(
          rawAcademicYear,
          academicYearLabelById,
        ),
        term: this.resolveTermName(rawTerm, termNameById),
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
          select: 'title AssessmentType maxScore deadline weight',
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

  private resolveSubjectScaleMax(mark: PopulatedMark): number {
    const subjectMax = this.toNumber(this.getProp<number>(mark.subject, 'maxScore'));
    return subjectMax !== null ? subjectMax : 100;
  }

  private resolveAssessmentWeight(mark: PopulatedMark): number {
    const candidates = [
      this.toNumber(this.getProp<number>(mark.assessment, 'weight')),
      this.toNumber(mark.weight),
    ];
    for (const candidate of candidates) {
      if (candidate !== null) return candidate;
    }
    return 1;
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

  private toObjectId(id: string, fieldName: string): string {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName}: ${id}`);
    }
    return id;
  }

  private async resolveTermAndAcademicYearNames(marks: PopulatedMark[]) {
    const termIds = new Set<string>();
    const academicYearIds = new Set<string>();

    for (const mark of marks) {
      const rawTerm =
        mark.term ?? this.getProp<any>(mark.assessment, 'term') ?? null;
      const rawAcademicYear =
        mark.academicYear ??
        this.getProp<any>(mark.assessment, 'academicYear') ??
        null;

      const termId = this.extractObjectId(rawTerm);
      if (termId) {
        termIds.add(termId);
      }

      const academicYearId = this.extractObjectId(rawAcademicYear);
      if (academicYearId) {
        academicYearIds.add(academicYearId);
      }
    }

    const termsPromise = termIds.size
      ? this.termModel
          .find({ _id: { $in: Array.from(termIds) } })
          .select('name')
          .lean()
          .exec()
      : Promise.resolve<unknown[]>([]);

    const academicYearsPromise = academicYearIds.size
      ? this.academicYearModel
          .find({ _id: { $in: Array.from(academicYearIds) } })
          .select('label')
          .lean()
          .exec()
      : Promise.resolve<unknown[]>([]);

    const [terms, academicYears] = await Promise.all([
      termsPromise as Promise<Array<Record<string, unknown>>>,
      academicYearsPromise as Promise<Array<Record<string, unknown>>>,
    ]);

    const termNameById = new Map<string, string>();
    for (const term of terms) {
      const termId = this.extractObjectId(term);
      const termName = this.getProp<string>(term, 'name');
      if (termId && termName) {
        termNameById.set(termId, termName);
      }
    }

    const academicYearLabelById = new Map<string, string>();
    for (const academicYear of academicYears) {
      const academicYearId = this.extractObjectId(academicYear);
      const academicYearLabel = this.getProp<string>(academicYear, 'label');
      if (academicYearId && academicYearLabel) {
        academicYearLabelById.set(academicYearId, academicYearLabel);
      }
    }

    return { termNameById, academicYearLabelById };
  }

  private resolveTermName(
    rawTerm: unknown,
    termNameById: Map<string, string>,
  ): string {
    const populatedName = this.getProp<string>(rawTerm, 'name');
    if (populatedName) {
      return populatedName;
    }

    const termId = this.extractObjectId(rawTerm);
    if (termId) {
      const resolved = termNameById.get(termId);
      if (resolved) {
        return resolved;
      }
    }

    if (typeof rawTerm === 'string') {
      return rawTerm;
    }

    return 'Unknown Term';
  }

  private resolveAcademicYearLabel(
    rawAcademicYear: unknown,
    academicYearLabelById: Map<string, string>,
  ): string {
    const populatedLabel = this.getProp<string>(rawAcademicYear, 'label');
    if (populatedLabel) {
      return populatedLabel;
    }

    const academicYearId = this.extractObjectId(rawAcademicYear);
    if (academicYearId) {
      const resolved = academicYearLabelById.get(academicYearId);
      if (resolved) {
        return resolved;
      }
    }

    if (typeof rawAcademicYear === 'string') {
      return rawAcademicYear;
    }

    return 'Unknown Academic Year';
  }

  private round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async buildAssessmentFiltersMatch(
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

    // Prefer IDs if provided; directly match on stored IDs in Marks
    if (filters.termId) {
      match.term = this.toObjectId(filters.termId, 'termId');
    } else if (normalizedTerm) {
      const termVariants = [normalizedTerm];
      if (/^\d+$/.test(normalizedTerm)) {
        termVariants.push(`Term ${normalizedTerm}`, `term ${normalizedTerm}`);
      }
      match.term =
        termVariants.length === 1 ? termVariants[0] : { $in: termVariants };
    }

    if (filters.academicYearId) {
      match.academicYear = this.toObjectId(filters.academicYearId, 'academicYearId');
    } else if (normalizedYear) {
      const escapedYear = normalizedYear.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.academicYear = normalizedYear.includes('/')
        ? normalizedYear
        : new RegExp(escapedYear, 'i');
    }

    return match;
  }
}
