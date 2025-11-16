import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { promises as fs } from 'fs';
import { ReportsPdfService, PrimaryReportContext } from './reports-pdf.service';
import { StudentService } from 'src/students/student.service';
import { StudentPerformanceService } from 'src/students/student-performance.service';
import { AcademicYearService } from 'src/academic-year/academic-year.service';
import { TermService } from 'src/terms/terms.service';
import { PassMarksService } from 'src/pass-marks/pass-marks.service';
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
    private readonly academicYearService: AcademicYearService,
    private readonly termService: TermService,
    private readonly passMarksService: PassMarksService,
    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,
  ) {}

  async generateStudentReportPdf(
    studentId: string,
    academicYearId: string,
    termId?: string,
  ): Promise<ReportGenerationResult> {
    if (!studentId) {
      throw new BadRequestException('Student id is required');
    }

    if (!academicYearId) {
      throw new BadRequestException('Academic year id is required');
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
          .populate('assignedSubjects')
          .lean()
          .exec()
      : null;

    const teacherName = this.resolveTeacherName(classInfo);

    // Resolve academic year and term
    const academicYear = await this.academicYearService.findById(academicYearId);
    const academicYearLabel = (academicYear as any).label ?? '';

    let termLabel: string | undefined;
    if (termId) {
      const term = await this.termService.findById(termId as any);
      const order = (term as any)?.order;
      termLabel = typeof order === 'number' ? `Term ${order}` : undefined;
    }

    // Determine template by class grade level: ns1/ns2/ns3 => nursery, p1..p6 => primary
    const gradeLevelRaw: string | null =
      (classInfo?.gradeLevel as any) ?? ((student as any).gradeLevel ?? null);
    const gradeLevel = typeof gradeLevelRaw === 'string' ? gradeLevelRaw.toLowerCase() : null;
    const isNursery =
      gradeLevel === 'ns1' || gradeLevel === 'ns2' || gradeLevel === 'ns3';

    let subjects: Array<any> | undefined;
    let summaryPercentage: string | null = null;
    let summaryNotes: string | null = null;
    let yearView:
      | {
          terms: Array<{ label: string }>;
          subjects: Array<{
            name: string;
            byTerm: Array<{ maximum: string | number; obtained: string | number; grade: string }>;
          }>;
          overall?: { percentage?: string | null; notes?: string | null };
        }
      | undefined;

    if (!termLabel && !isNursery) {
      // Primary full-year view across 3 terms
      const terms = await this.termService.findByAcademicYear(academicYearId);
      const termLabels = terms.map((t: any) => (t?.order ? `Term ${t.order}` : (t?.name ?? 'Term')));
      const termIds = terms.map((t: any) => t?._id?.toString()).filter(Boolean) as string[];
      const subjectNameToIndex = new Map<string, number>();
      const yearSubjects: Array<{
        name: string;
        byTerm: Array<{ maximum: string | number; obtained: string | number; grade: string }>;
      }> = [];

      // Seed from assigned subjects to ensure all appear
      const assigned = Array.isArray((classInfo as any)?.assignedSubjects)
        ? ((classInfo as any).assignedSubjects as any[])
        : [];
      for (const s of assigned) {
        const name = s?.name ?? s?.shortName ?? '—';
        if (!subjectNameToIndex.has(name)) {
          subjectNameToIndex.set(name, yearSubjects.length);
          yearSubjects.push({
            name,
            byTerm: [
              { maximum: this.formatNumber(s?.maxScore ?? 100), obtained: this.formatNumber(0), grade: 'D' },
              { maximum: this.formatNumber(s?.maxScore ?? 100), obtained: this.formatNumber(0), grade: 'D' },
              { maximum: this.formatNumber(s?.maxScore ?? 100), obtained: this.formatNumber(0), grade: 'D' },
            ],
          });
        }
      }

      for (let i = 0; i < termIds.length; i++) {
        const tId = termIds[i];
        const perf = await this.studentPerformanceService.getStudentPerformanceSummary(studentId, {
          academicYear: academicYearId,
          term: tId,
        });
        for (const sub of perf.subjects) {
          const name = sub.subjectName;
          const idx =
            subjectNameToIndex.get(name) ?? (() => {
              const newIndex = yearSubjects.length;
              subjectNameToIndex.set(name, newIndex);
              const defaultMax = sub.totalMax ?? 100;
              yearSubjects.push({
                name,
                byTerm: [
                  { maximum: this.formatNumber(defaultMax), obtained: this.formatNumber(0), grade: 'D' },
                  { maximum: this.formatNumber(defaultMax), obtained: this.formatNumber(0), grade: 'D' },
                  { maximum: this.formatNumber(defaultMax), obtained: this.formatNumber(0), grade: 'D' },
                ],
              });
              return newIndex;
            })();
          const percentage = this.safePercentage(sub.totalScore, sub.totalMax);
          const { grade } = this.resolvePrimaryGrade(percentage);
          yearSubjects[idx].byTerm[i] = {
            maximum: this.formatNumber(sub.totalMax),
            obtained: this.formatNumber(sub.totalScore),
            grade,
          };
        }
      }

      yearView = {
        terms: termLabels.map((l) => ({ label: l })),
        subjects: yearSubjects,
        overall: undefined,
      };
    } else {
      // Single term (or nursery combined)
      const performance = await this.studentPerformanceService.getStudentPerformanceSummary(
        studentId,
        { academicYear: academicYearId, term: termId },
      );

      subjects = performance.subjects.map((subject) => {
        const percentage = this.safePercentage(subject.totalScore, subject.totalMax);
        const { grade, comment } = isNursery
          ? this.resolveNurseryMention(percentage)
          : this.resolvePrimaryGrade(percentage);

        const indicatorClass = isNursery
          ? this.resolveNurseryBadgeClass(percentage)
          : undefined;

        return {
          name: subject.subjectName,
          maximum: this.formatNumber(subject.totalMax),
          obtained: this.formatNumber(subject.totalScore),
          grade,
          comment,
          percentage: percentage !== null ? `${percentage.toFixed(0)}%` : null,
          indicatorClass,
        };
      });

      // If no recorded marks, list assigned subjects with zero scores
      if ((!subjects || subjects.length === 0) && classInfo && Array.isArray((classInfo as any).assignedSubjects)) {
        subjects = ((classInfo as any).assignedSubjects as any[]).map((s: any) => {
          const max = typeof s?.maxScore === 'number' ? s.maxScore : 100;
          const { grade, comment } = isNursery
            ? this.resolveNurseryMention(0)
            : this.resolvePrimaryGrade(0);
          return {
            name: s?.name ?? s?.shortName ?? '—',
            maximum: this.formatNumber(max),
            obtained: this.formatNumber(0),
            grade,
            comment,
            percentage: '0%',
            indicatorClass: isNursery ? this.resolveNurseryBadgeClass(0) : undefined,
          };
        });
      }

      const overallPercentage = this.safePercentage(
        performance.overall.totalScore,
        performance.overall.totalMax,
      );
      summaryPercentage = overallPercentage !== null ? `${overallPercentage.toFixed(1)}%` : null;
      summaryNotes =
        performance.overall.totalMax > 0
          ? `Total obtained: ${this.formatNumber(performance.overall.totalScore)} / ${this.formatNumber(performance.overall.totalMax)}`
          : null;
    }

    // Determine school info from populated student
    const school = (student as any).school ?? null;
    const schoolName = school?.name ?? '—';
    const schoolEmail = school?.email ?? null;
    const schoolPhone = school?.phoneNumber ?? null;

    // Promotion/Status based on pass-marks
    const schoolId = this.extractObjectId((student as any).school);
    let promotionStatus: string | null = null;
    if (schoolId) {
      const passCfg = await this.passMarksService.findBySchool(schoolId);
      if (passCfg) {
        const pctNumber =
          summaryPercentage && summaryPercentage.endsWith('%')
            ? Number(summaryPercentage.replace('%', ''))
            : null;
        if (pctNumber !== null && Number.isFinite(pctNumber)) {
          if (pctNumber >= passCfg.passMark) promotionStatus = 'Promoted';
          else if (pctNumber >= passCfg.secondSittingMin && pctNumber <= passCfg.secondSittingMax)
            promotionStatus = 'Second sitting';
          else if (pctNumber < passCfg.failMark) promotionStatus = 'Repeat';
        }
      }
    }

    // Prepare logo as data URL to ensure visibility in headless PDF
    const logoFsPath = path.resolve(process.cwd(), 'assets', 'logo.png');
    let logoSrc = undefined as string | undefined;
    try {
      const logoBuffer = await fs.readFile(logoFsPath);
      logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch {
      logoSrc = undefined;
    }
    const context: PrimaryReportContext = {
      assets: {
        logoPath: logoSrc,
      },
      school: {
        name: schoolName,
        email: schoolEmail,
        phone: schoolPhone,
      },
      student: {
        fullName: (student as any).name ?? '—',
        class: classInfo?.name ?? this.nullableString((student as any).gradeLevel),
        additionalInfo: this.composeStudentExtraInfo(student as any, academicYearLabel),
      },
      report: {
        title: !termLabel && !isNursery ? 'ANNUAL REPORT' : termLabel ? `REPORT - ${termLabel}` : 'MID-TERM REPORT',
        periodLabel: 'Academic Year',
        period: academicYearLabel,
      },
      subjects,
      yearView,
      summary: {
        percentageLabel: 'Percentage',
        percentage: summaryPercentage,
        notes: [summaryNotes, promotionStatus ? `Status: ${promotionStatus}` : null].filter(Boolean).join(' • '),
      },
      teacher: {
        name: teacherName ?? 'Class teacher not assigned',
      },
    };

    const pdfBuffer = isNursery
      ? await this.reportsPdfService.renderNurserySchoolReport(context)
      : await this.reportsPdfService.renderPrimarySchoolReport(context);

    const safeTerm = (termLabel ?? 'report').replace(/\s+/g, '-').toLowerCase();
    const fileName = `student-${studentId}-${safeTerm}-${academicYearLabel}.pdf`;

    this.logger.log(
      `Generated report for student ${studentId} (${academicYearLabel} ${termLabel ?? ''})`,
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

  private resolvePrimaryGrade(percentage: number | null) {
    if (percentage === null) {
      return { grade: 'F', comment: 'Fail' };
    }
    if (percentage >= 90) return { grade: 'A+', comment: 'Excellent' };
    if (percentage >= 80) return { grade: 'A', comment: 'Very good' };
    if (percentage >= 70) return { grade: 'B', comment: 'Good' };
    if (percentage >= 60) return { grade: 'C', comment: 'Satisfactory' };
    if (percentage >= 50) return { grade: 'D', comment: 'Pass' };
    if (percentage >= 40) return { grade: 'E', comment: 'Borderline' };
    return { grade: 'F', comment: 'Fail' };
  }

  private resolveNurseryMention(percentage: number | null) {
    if (percentage === null) {
      return { grade: 'Pass', comment: 'Pass' };
    }
    if (percentage >= 85) return { grade: 'Excellent', comment: 'Excellent' };
    if (percentage >= 70) return { grade: 'Very Good', comment: 'Very Good' };
    if (percentage >= 50) return { grade: 'Good', comment: 'Good' };
    return { grade: 'Pass', comment: 'Pass' };
  }

  private resolveNurseryBadgeClass(percentage: number | null): string {
    if (percentage === null) return 'badge-orange';
    if (percentage >= 85) return 'badge-yellow';
    if (percentage >= 70) return 'badge-green';
    if (percentage >= 50) return 'badge-blue';
    return 'badge-orange';
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
      parts.push(`Level: ${student.gradeLevel}`);
    }
    if (student.studentId) {
      parts.push(`Student ID: ${student.studentId}`);
    }
    parts.push(`Year: ${academicYear}`);
    return parts.length ? parts.join(' • ') : null;
  }

  private nullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  }
}
