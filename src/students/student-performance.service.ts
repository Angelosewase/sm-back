import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  Marks,
  MarksDocument,
} from 'src/marks/schemas/marks.schema';
import {
  Assessment,
  AssessmentDocument,
} from 'src/assessments/schemas/assessment-schema';
import {
  Subject,
  SubjectDocument,
} from 'src/subjects/schemas/subject.schema';
import { Class, ClassDocument } from 'src/classes/schemas/class.schema';

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
      deadline?: Date | null;
    }>;
  }>;
}

@Injectable()
export class StudentPerformanceService {
  constructor(
    @InjectModel(Marks.name)
    private readonly marksModel: Model<MarksDocument>,
    @InjectModel(Subject.name)
    private readonly subjectModel: Model<SubjectDocument>,
    @InjectModel(Assessment.name)
    private readonly assessmentModel: Model<AssessmentDocument>,
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
  ) {}

  async getStudentPerformanceSummary(
    studentId: string,
    filters: StudentPerformanceFilters = {},
  ): Promise<{
    subjects: SubjectPerformanceSummary[];
    overall: { totalScore: number; totalMax: number; percentage: number | null };
  }> {
    const matchStage = this.buildMatchStage(studentId, filters);

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      ...this.lookupStages(),
      {
        $group: {
          _id: {
            subject: '$subject._id',
            term: '$term',
          },
          subjectName: { $first: '$subject.name' },
          subjectCode: { $first: '$subject.code' },
          totalScore: { $sum: '$score' },
          totalMax: { $sum: '$effectiveMaxScore' },
        },
      },
      {
        $group: {
          _id: '$_id.subject',
          subjectName: { $first: '$subjectName' },
          subjectCode: { $first: '$subjectCode' },
          totalScore: { $sum: '$totalScore' },
          totalMax: { $sum: '$totalMax' },
          terms: {
            $push: {
              term: '$_id.term',
              totalScore: '$totalScore',
              totalMax: '$totalMax',
            },
          },
        },
      },
      { $sort: { subjectName: 1 } },
    ];

    const rows = await this.marksModel.aggregate(pipeline).exec();
    const subjects: SubjectPerformanceSummary[] = rows.map((row) => {
      const totalScore = this.round(row.totalScore || 0);
      const totalMax = this.round(row.totalMax || 0);

      const terms: SubjectTermBreakdown[] = (row.terms || []).map(
        (term: any) => {
          const termScore = this.round(term.totalScore || 0);
          const termMax = this.round(term.totalMax || 0);
          return {
            term: term.term ?? null,
            totalScore: termScore,
            totalMax: termMax,
            percentage: termMax > 0 ? this.round((termScore / termMax) * 100) : null,
          };
        },
      );

      return {
        subjectId: row._id ? String(row._id) : null,
        subjectName: row.subjectName || 'Unknown Subject',
        totalScore,
        totalMax,
        percentage: totalMax > 0 ? this.round((totalScore / totalMax) * 100) : null,
        terms,
      };
    });

    const overallTotals = subjects.reduce(
      (acc, subject) => {
        acc.totalScore += subject.totalScore || 0;
        acc.totalMax += subject.totalMax || 0;
        return acc;
      },
      { totalScore: 0, totalMax: 0 },
    );

    const overallPercentage =
      overallTotals.totalMax > 0
        ? this.round((overallTotals.totalScore / overallTotals.totalMax) * 100)
        : null;

    return {
      subjects,
      overall: {
        totalScore: this.round(overallTotals.totalScore),
        totalMax: this.round(overallTotals.totalMax),
        percentage: overallPercentage,
      },
    };
  }

  async getStudentAssignmentsBreakdown(
    studentId: string,
    filters: StudentPerformanceFilters = {},
  ): Promise<AssignmentsBreakdown[]> {
    const matchStage = this.buildMatchStage(studentId, filters);

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      ...this.lookupStages(),
      {
        $group: {
          _id: {
            academicYear: '$academicYear',
            subject: '$subject._id',
            assessment: '$assessment._id',
          },
          academicYear: { $first: '$academicYear' },
          subjectId: { $first: '$subject._id' },
          subjectName: { $first: '$subject.name' },
          subjectCode: { $first: '$subject.code' },
          classId: { $first: '$class._id' },
          className: { $first: '$class.name' },
          assessmentId: { $first: '$assessment._id' },
          assessmentTitle: { $first: '$assessment.title' },
          assessmentType: { $first: '$assessment.AssessmentType' },
          term: { $first: '$term' },
          deadline: { $first: '$assessment.deadline' },
          totalScore: { $sum: '$score' },
          totalMax: { $sum: '$effectiveMaxScore' },
        },
      },
      {
        $group: {
          _id: {
            academicYear: '$_id.academicYear',
            subject: '$_id.subject',
          },
          academicYear: { $first: '$academicYear' },
          subjectId: { $first: '$subjectId' },
          subjectName: { $first: '$subjectName' },
          subjectCode: { $first: '$subjectCode' },
          classId: { $first: '$classId' },
          className: { $first: '$className' },
          totalScore: { $sum: '$totalScore' },
          totalMax: { $sum: '$totalMax' },
          assignments: {
            $push: {
              assessmentId: '$assessmentId',
              title: '$assessmentTitle',
              term: '$term',
              assessmentType: '$assessmentType',
              score: '$totalScore',
              maxScore: '$totalMax',
              deadline: '$deadline',
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id.academicYear',
          academicYear: { $first: '$academicYear' },
          subjects: {
            $push: {
              subjectId: '$subjectId',
              subjectName: '$subjectName',
              subjectCode: '$subjectCode',
              classId: '$classId',
              className: '$className',
              totalScore: '$totalScore',
              totalMax: '$totalMax',
              assignments: '$assignments',
            },
          },
        },
      },
      { $sort: { academicYear: -1 } },
    ];

    const rows = await this.marksModel.aggregate(pipeline).exec();

    return rows.map((yearRow: any) => ({
      academicYear: yearRow.academicYear ?? null,
      subjects: (yearRow.subjects || []).map((subject: any) => {
        const totalScore = this.round(subject.totalScore || 0);
        const totalMax = this.round(subject.totalMax || 0);
        return {
          subjectId: subject.subjectId ? String(subject.subjectId) : null,
          subjectName: subject.subjectName || 'Unknown Subject',
          subjectCode: subject.subjectCode,
          classId: subject.classId ? String(subject.classId) : null,
          className: subject.className ?? null,
          totalScore,
          totalMax,
          percentage:
            totalMax > 0 ? this.round((totalScore / totalMax) * 100) : null,
          assignments: (subject.assignments || []).map((assignment: any) => {
            const score = this.round(assignment.score || 0);
            const maxScore = this.round(assignment.maxScore || 0);
            return {
              assessmentId: assignment.assessmentId
                ? String(assignment.assessmentId)
                : null,
              title: assignment.title || 'Assessment',
              term: assignment.term ?? null,
              assessmentType: assignment.assessmentType ?? null,
              score,
              maxScore,
              percentage:
                maxScore > 0 ? this.round((score / maxScore) * 100) : null,
              deadline: assignment.deadline ?? null,
            };
          }),
        };
      }),
    }));
  }

  private lookupStages() {
    return [
      {
        $lookup: {
          from: this.assessmentModel.collection.name,
          localField: 'assessment',
          foreignField: '_id',
          as: 'assessment',
        },
      },
      {
        $unwind: {
          path: '$assessment',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: this.subjectModel.collection.name,
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
        },
      },
      {
        $unwind: {
          path: '$subject',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: this.classModel.collection.name,
          localField: 'class',
          foreignField: '_id',
          as: 'class',
        },
      },
      {
        $unwind: {
          path: '$class',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          effectiveMaxScore: {
            $let: {
              vars: {
                markMax: '$maxScore',
                assessmentMax: '$assessment.maxScore',
                subjectMax: '$subject.maxScore',
              },
              in: {
                $cond: [
                  { $gt: ['$$markMax', 0] },
                  '$$markMax',
                  {
                    $cond: [
                      { $gt: ['$$assessmentMax', 0] },
                      '$$assessmentMax',
                      {
                        $cond: [
                          { $gt: ['$$subjectMax', 0] },
                          '$$subjectMax',
                          100,
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    ];
  }

  private buildMatchStage(
    studentId: string,
    filters: StudentPerformanceFilters,
  ) {
    const studentObjectId = this.toObjectId(studentId, 'studentId');
    const match: Record<string, any> = {
      student: studentObjectId,
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
      match.assessment = this.toObjectId(
        filters.assessmentId,
        'assessmentId',
      );
    }

    if (filters.assessmentType) {
      match.assessmentType = filters.assessmentType;
    }

    return match;
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
}


