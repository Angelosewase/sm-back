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

export interface AssignmentsBreakdown {
  academicYear: string | null;
  subjects: Array<{
    subjectId: string | null;
    subjectName: string;
    subjectCode?: string;
    classId?: string | null;
    className?: string | null;
    totalScore: number;
    totalMax: number;
    percentage: number | null;
    assignments: Array<{
      assessmentId: string | null;
      title: string;
      term: string | null;
      assessmentType?: string | null;
      score: number;
      maxScore: number;
      percentage: number | null;
      deadline?: Date | string | null;
    }>;
  }>;
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
    overall: { totalScore: number; totalMax: number; percentage: number | null };
  }> {
    const matchStage = this.buildMatchStage(studentId, filters);
    console.log(
      '[StudentPerformanceService][summary] match stage',
      JSON.stringify(matchStage),
    );
    const marks = await this.findMarks(matchStage, studentId);
    console.log(
      '[StudentPerformanceService][summary] marks fetched',
      marks.length,
    );
    console.log(
      '[StudentPerformanceService][summary] marks sample',
      JSON.stringify(marks, null, 2),
    );

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
      console.log(
        '[StudentPerformanceService][summary] processing mark',
        JSON.stringify(mark, null, 2),
      );
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

      const termAcc =
        subjectAcc.terms.get(termKey) ?? { totalScore: 0, totalMax: 0 };
      console.log(
        '[StudentPerformanceService][summary] term addition',
        subjectKey,
        termKey,
        { score, maxScore },
      );
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
        console.log(
          '[StudentPerformanceService][summary] subject bucket before totals',
          subject.subjectName,
          {
            totalScore: subject.totalScore,
            totalMax: subject.totalMax,
            terms: Array.from(subject.terms.entries()),
          },
        );
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

    console.log(
      '[StudentPerformanceService][summary] overall result',
      JSON.stringify(
        {
          subjects,
          overall: {
            totalScore: overallScore,
            totalMax: overallMax,
            percentage: overallPercentage,
          },
        },
        null,
        2,
      ),
    );

    return {
      subjects,
      overall: {
        totalScore: this.round(overallScore),
        totalMax: this.round(overallMax),
        percentage: overallPercentage,
      },
    };
  }

  async getStudentAssignmentsBreakdown(
    studentId: string,
    filters: StudentPerformanceFilters = {},
  ): Promise<AssignmentsBreakdown[]> {
    const matchStage = this.buildMatchStage(studentId, filters);
    console.log(
      '[StudentPerformanceService][assignments] match stage',
      JSON.stringify(matchStage),
    );
    const marks = await this.findMarks(matchStage, studentId);
    console.log(
      '[StudentPerformanceService][assignments] marks fetched',
      marks.length,
    );
    console.log(
      '[StudentPerformanceService][assignments] marks sample',
      JSON.stringify(marks, null, 2),
    );

    const yearMap = new Map<
      string | null,
      Map<
        string,
        {
          subjectId: string | null;
          subjectName: string;
          subjectCode?: string;
          classId?: string | null;
          className?: string | null;
          totalScore: number;
          totalMax: number;
          assignments: Map<
            string,
            {
              assessmentId: string | null;
              title: string;
              term: string | null;
              assessmentType: string | null;
              deadline: Date | string | null;
              score: number;
              maxScore: number;
            }
          >;
        }
      >
    >();

    for (const mark of marks) {
      console.log(
        '[StudentPerformanceService][assignments] processing mark',
        JSON.stringify(mark, null, 2),
      );
      const yearKey = mark.academicYear ?? null;
      const { subjectId, subjectName, subjectCode, subjectKey } =
        this.extractSubjectInfo(mark);
      const classId = this.extractObjectId(mark.class);
      const className = this.getProp<string>(mark.class, 'name');
      const score = this.toNumber(mark.score) ?? 0;
      const maxScore = this.resolveMaxScore(mark);

      let subjectsMap = yearMap.get(yearKey);
      if (!subjectsMap) {
        subjectsMap = new Map();
        yearMap.set(yearKey, subjectsMap);
      }

      let subjectAcc = subjectsMap.get(subjectKey);
      if (!subjectAcc) {
        subjectAcc = {
          subjectId,
          subjectName,
          subjectCode,
          classId,
          className,
          totalScore: 0,
          totalMax: 0,
          assignments: new Map(),
        };
        subjectsMap.set(subjectKey, subjectAcc);
      }

      subjectAcc.totalScore += score;
      subjectAcc.totalMax += maxScore;

      const assignmentInfo = this.extractAssignmentInfo(mark, subjectKey);
      console.log(
        '[StudentPerformanceService][assignments] assignment bucket key',
        assignmentInfo,
      );
      let assignmentAcc = subjectAcc.assignments.get(assignmentInfo.key);
      if (!assignmentAcc) {
        assignmentAcc = {
          assessmentId: assignmentInfo.id,
          title: assignmentInfo.title,
          term: assignmentInfo.term,
          assessmentType: assignmentInfo.type,
          deadline: assignmentInfo.deadline,
          score: 0,
          maxScore: 0,
        };
        subjectAcc.assignments.set(assignmentInfo.key, assignmentAcc);
      }

      assignmentAcc.score += score;
      assignmentAcc.maxScore += maxScore;
    }

    const result = Array.from(yearMap.entries())
      .map(([academicYear, subjectsMap]) => {
        console.log(
          '[StudentPerformanceService][assignments] year aggregate',
          academicYear,
          Array.from(subjectsMap.entries()),
        );
        return {
          academicYear,
          subjects: Array.from(subjectsMap.values())
            .sort((a, b) => a.subjectName.localeCompare(b.subjectName))
            .map((subject) => ({
              subjectId: subject.subjectId,
              subjectName: subject.subjectName,
              subjectCode: subject.subjectCode,
              classId: subject.classId ?? null,
              className: subject.className ?? null,
              totalScore: this.round(subject.totalScore),
              totalMax: this.round(subject.totalMax),
              percentage:
                subject.totalMax > 0
                  ? this.round((subject.totalScore / subject.totalMax) * 100)
                  : null,
              assignments: Array.from(subject.assignments.values()).map(
                (assignment) => ({
                  assessmentId: assignment.assessmentId,
                  title: assignment.title,
                  term: assignment.term,
                  assessmentType: assignment.assessmentType,
                  score: this.round(assignment.score),
                  maxScore: this.round(assignment.maxScore),
                  percentage:
                    assignment.maxScore > 0
                      ? this.round(
                          (assignment.score / assignment.maxScore) * 100,
                        )
                      : null,
                  deadline: assignment.deadline ?? null,
                }),
              ),
            })),
        };
      })
      .sort((a, b) => {
        if (!a.academicYear) return 1;
        if (!b.academicYear) return -1;
        return (b.academicYear || '').localeCompare(a.academicYear || '');
      });

    console.log(
      '[StudentPerformanceService][assignments] final result',
      JSON.stringify(result, null, 2),
    );
    return result;
  }

  private buildMatchStage(
    studentId: string,
    filters: StudentPerformanceFilters,
  ) {
    const match: Record<string, any> = {
      student: studentId,
    };
    console.log(
      '[StudentPerformanceService][helpers] initial match object',
      match,
    );

    if (filters.subjectId) {
      match.subject = this.toObjectId(filters.subjectId, 'subjectId');
      console.log(
        '[StudentPerformanceService][helpers] applied subject filter',
        match.subject,
      );
    }

    if (filters.academicYear && filters.academicYear.toLowerCase() !== 'all') {
      match.academicYear = filters.academicYear;
      console.log(
        '[StudentPerformanceService][helpers] applied academicYear filter',
        match.academicYear,
      );
    }

    if (filters.term && filters.term.toLowerCase() !== 'all') {
      match.term = filters.term;
      console.log(
        '[StudentPerformanceService][helpers] applied term filter',
        match.term,
      );
    }

    if (filters.classId) {
      match.class = this.toObjectId(filters.classId, 'classId');
      console.log(
        '[StudentPerformanceService][helpers] applied class filter',
        match.class,
      );
    }

    if (filters.assessmentId) {
      match.assessment = this.toObjectId(
        filters.assessmentId,
        'assessmentId',
      );
      console.log(
        '[StudentPerformanceService][helpers] applied assessment filter',
        match.assessment,
      );
    }

    if (filters.assessmentType) {
      match.assessmentType = filters.assessmentType;
      console.log(
        '[StudentPerformanceService][helpers] applied assessmentType filter',
        match.assessmentType,
      );
    }

    console.log(
      '[StudentPerformanceService][helpers] final match object',
      match,
    );
    return match;
  }

  private async findMarks(
    match: Record<string, any>,
    studentId: string,
  ): Promise<PopulatedMark[]> {
    console.log('[StudentPerformanceService][helpers] findMarks with', match);
    return this.marksModel
      .find({ ...match, student: studentId })
      .populate([
        { path: 'assessment', select: 'title AssessmentType maxScore deadline' },
        { path: 'subject', select: 'name code maxScore' },
        { path: 'class', select: 'name' },
      ])
      .lean()
      .exec();
  }

  private extractSubjectInfo(mark: PopulatedMark) {
    console.log(
      '[StudentPerformanceService][helpers] extractSubjectInfo subject value',
      mark.subject,
    );
    const subjectId = this.extractObjectId(mark.subject);
    const subjectName =
      this.getProp<string>(mark.subject, 'name') || 'Unknown Subject';
    const subjectCode = this.getProp<string>(mark.subject, 'code') ?? undefined;
    const subjectKey = subjectId ?? `unknown:${subjectName}`;
    return { subjectId, subjectName, subjectCode, subjectKey };
  }

  private extractAssignmentInfo(mark: PopulatedMark, subjectKey: string) {
    console.log(
      '[StudentPerformanceService][helpers] extractAssignmentInfo assessment value',
      mark.assessment,
    );
    const assessmentId = this.extractObjectId(mark.assessment);
    const title =
      this.getProp<string>(mark.assessment, 'title') ||
      mark.assessmentType ||
      'Assessment';
    const term = mark.term ?? null;
    const type =
      this.getProp<string>(mark.assessment, 'AssessmentType') ??
      mark.assessmentType ??
      null;
    const deadline = this.getProp<any>(mark.assessment, 'deadline') ?? null;
    const key = assessmentId ?? `${subjectKey}:${term ?? 'term'}:${title}`;
    return { id: assessmentId, title, term, type, deadline, key };
  }

  private extractObjectId(value: unknown): string | null {
    console.log(
      '[StudentPerformanceService][helpers] extractObjectId value',
      value,
    );
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
    console.log(
      '[StudentPerformanceService][helpers] resolveMaxScore inputs',
      mark.maxScore,
      this.getProp<number>(mark.assessment, 'maxScore'),
      this.getProp<number>(mark.subject, 'maxScore'),
    );
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
    console.log('[StudentPerformanceService][helpers] toNumber value', value);
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Number(value);
    console.log('[StudentPerformanceService][helpers] toNumber parsed', parsed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getProp<T>(source: unknown, prop: string): T | null {
    if (source && typeof source === 'object' && prop in (source as any)) {
      const result = (source as any)[prop];
      console.log(
        '[StudentPerformanceService][helpers] getProp result',
        prop,
        result,
      );
      return (result ?? null) as T | null;
    }
    return null;
  }

  private toObjectId(id: string, fieldName: string) {
    console.log(
      '[StudentPerformanceService][helpers] toObjectId input',
      fieldName,
      id,
    );
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${fieldName}: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  private round(value: number) {
    console.log('[StudentPerformanceService][helpers] round input', value);
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}

