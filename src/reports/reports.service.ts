import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReportsPdfService, PrimaryReportContext } from './reports-pdf.service';
import { StudentService } from 'src/students/student.service';
import { StudentPerformanceService } from 'src/students/student-performance.service';
import {
  Class,
  ClassDocument,
} from 'src/classes/schemas/class.schema';

interface ReportGenerationResult {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportsPdfService: ReportsPdfService,
    private readonly studentService: StudentService,
    private readonly studentPerformanceService: StudentPerformanceService,
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
  ) {}

  async generateStudentReportPdf(
    studentId: string,
    academicYear: string,
    term?: string,
  ): Promise<ReportGenerationResult> {
    if (!studentId) {
      throw new BadRequestException('Student id is required');
    }

    if (!academicYear) {
      throw new BadRequestException('Academic year is required');
    }

    const student = await this.studentService.getStudentById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const classId = this.extractObjectId((student as any).class);
    const classInfo = classId
      ? await this.classModel
          .findById(classId)
          .populate({
            path: 'classTeacher',
            populate: { path: 'user', select: 'name' },
          })
          .lean()
          .exec()
      : null;

    const teacherName = this.resolveTeacherName(classInfo);

    const performance = await this.studentPerformanceService.getStudentPerformanceSummary(
      studentId,
      { academicYear, term },
    );

    const subjects = performance.subjects.map((subject) => {
      const percentage = this.safePercentage(
        subject.totalScore,
        subject.totalMax,
      );
      const { grade, comment } = this.resolveGradeAndComment(percentage);

      return {
        name: subject.subjectName,
        maximum: this.formatNumber(subject.totalMax),
        obtained: this.formatNumber(subject.totalScore),
        grade,
        comment,
      };
    });

    const overallPercentage = this.safePercentage(
      performance.overall.totalScore,
      performance.overall.totalMax,
    );

    const context: PrimaryReportContext = {
      student: {
        fullName: (student as any).name ?? '—',
        class: classInfo?.name ?? this.nullableString((student as any).gradeLevel),
        additionalInfo: this.composeStudentExtraInfo(student as any, academicYear),
      },
      report: {
        title: term ? `BULLETIN - ${term}` : 'BULLETIN DU MI-TRIMESTRE',
        periodLabel: 'Année académique',
        period: academicYear,
      },
      subjects,
      summary: {
        percentageLabel: 'Pourcentage',
        percentage:
          overallPercentage !== null ? `${overallPercentage.toFixed(1)}%` : null,
        notes:
          performance.overall.totalMax > 0
            ? `Total obtenu: ${this.formatNumber(performance.overall.totalScore)} / ${this.formatNumber(performance.overall.totalMax)}`
            : null,
      },
      teacher: {
        name: teacherName ?? 'Titulaire non assigné',
      },
    };

    const pdfBuffer = await this.reportsPdfService.renderPrimarySchoolReport(
      context,
    );

    const safeTerm = term ? term.replace(/\s+/g, '-').toLowerCase() : 'report';
    const fileName = `student-${studentId}-${safeTerm}-${academicYear}.pdf`;

    this.logger.log(
      `Generated report for student ${studentId} (${academicYear} ${term ?? ''})`,
    );

    return {
      buffer: pdfBuffer,
      fileName,
      contentType: 'application/pdf',
    };
  }

  private resolveTeacherName(classInfo: any): string | null {
    if (!classInfo || !classInfo.classTeacher) {
      return null;
    }

    const classTeacher = classInfo.classTeacher as any;
    if (classTeacher.user && typeof classTeacher.user === 'object') {
      return classTeacher.user.name ?? classTeacher.teacherId ?? null;
    }

    if (classTeacher.teacherId) {
      return classTeacher.teacherId;
    }

    return null;
  }

  private safePercentage(
    score: number | null | undefined,
    max: number | null | undefined,
  ): number | null {
    if (!this.isFiniteNumber(score) || !this.isFiniteNumber(max) || !max) {
      return null;
    }
    return (Number(score) / Number(max)) * 100;
  }

  private resolveGradeAndComment(percentage: number | null) {
    if (percentage === null) {
      return { grade: 'D', comment: 'PASSABLE' };
    }

    if (percentage >= 85) {
      return { grade: 'A', comment: 'EXCELLENT' };
    }
    if (percentage >= 70) {
      return { grade: 'B', comment: 'TRÈS BIEN' };
    }
    if (percentage >= 50) {
      return { grade: 'C', comment: 'BIEN' };
    }
    return { grade: 'D', comment: 'PASSABLE' };
  }

  private formatNumber(value: number | null | undefined): string {
    if (!this.isFiniteNumber(value)) {
      return '0';
    }
    return Number(value).toFixed(1).replace(/\.0$/, '');
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private extractObjectId(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string' && Types.ObjectId.isValid(value)) {
      return value;
    }
    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }
    if (typeof value === 'object' && '_id' in (value as any)) {
      const raw = (value as any)._id;
      if (raw instanceof Types.ObjectId) {
        return raw.toHexString();
      }
      if (typeof raw === 'string' && Types.ObjectId.isValid(raw)) {
        return raw;
      }
    }
    return null;
  }

  private composeStudentExtraInfo(student: any, academicYear: string): string | null {
    const parts: string[] = [];
    if (student.gradeLevel) {
      parts.push(`Niveau: ${student.gradeLevel}`);
    }
    if (student.studentId) {
      parts.push(`Matricule: ${student.studentId}`);
    }
    parts.push(`Année: ${academicYear}`);
    return parts.length ? parts.join(' • ') : null;
  }

  private nullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  }
}
