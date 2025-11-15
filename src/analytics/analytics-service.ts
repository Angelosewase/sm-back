import { Injectable, Logger } from '@nestjs/common';
import { ClassesService } from 'src/classes/classes.service';
import { Role, User, UserDocument } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import { AdminStatsDto } from './dto/admin-stats-dto';
import { StudentService } from 'src/students/student.service';
import {
  AnalyticsResponseDto,
  TimeSeriesItem,
  GenderDistributionItem,
  RegistrationAnalyticsDto,
  SchoolPerformanceAnalyticsDto,
  AcademicYearPerformanceDto,
  StudentPerformanceDto,
} from './dto/analytics.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Student, StudentDocument } from 'src/students/schemas/student.schema';
import { subMonths, startOfMonth, format } from 'date-fns';
import { Marks, MarksDocument } from 'src/marks/schemas/marks.schema';
import { PerformanceQueryDto } from './dto/analytics-query.dto';
import { Class, ClassDocument } from 'src/classes/schemas/class.schema';
import { AcademicYear, AcademicYearDocument } from 'src/academic-year/schemas/academic-year.schema';
import { Term, TermDocument } from 'src/terms/schemas/term.schema';

interface ISeries {
  date: string;
  'Total Students': number;
  Teachers: number;
  Classes: number;
  'Staff Members': number;
}
@Injectable()
export class AnalyticsService {
  private logger = new Logger(AnalyticsService.name);
  constructor(
    private readonly classesService: ClassesService,
    private readonly usersService: UsersService,
    private readonly studentsService: StudentService,

    @InjectModel(Student.name)
    private readonly studentModel: Model<StudentDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Marks.name)
    private readonly marksModel: Model<MarksDocument>,

    @InjectModel(Class.name)
    private readonly classModel: Model<ClassDocument>,

    @InjectModel(AcademicYear.name)
    private readonly academicYearModel: Model<AcademicYearDocument>,

    @InjectModel(Term.name)
    private readonly termModel: Model<TermDocument>,
  ) {}

  async getAdminStats(schoolId: string): Promise<AdminStatsDto> {
    // -------------------------------------------------
    // 1. Current counts (using total from paginated result)
    // -------------------------------------------------
    const [studentsRes, teachersRes, classesRes, staffRes] = await Promise.all([
      this.studentsService.findStudents({
        schoolId: schoolId,
        page: 1,
        limit: 1,
      }),
      this.usersService.findAll({
        role: Role.TEACHER,
        school: schoolId,
        page: 1,
        limit: 1,
      }),
      this.classesService.findAll({
        school: schoolId,
        page: 1,
        limit: 1,
      }),
      this.usersService.findAll({
        role: Role.STAFF,
        school: schoolId,
        page: 1,
        limit: 1,
      }),
    ]);

    const totalStudents = studentsRes.meta.total;
    const totalTeachers = teachersRes.total;
    const totalClasses = classesRes.total;
    const totalStaffMembers = staffRes.total;

    // -------------------------------------------------
    // 2. Historic weekly data (last 7 weeks)
    // -------------------------------------------------
    const weeks = 7;
    const now = new Date();
    const series: ISeries[] = [];

    // Helper: get count for a given week offset
    const getCountForWeek = async (
      weekOffset: number,
      role?: Role | Role[],
      isClass = false,
      isStudent = false,
    ): Promise<number> => {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - weekOffset * 7);

      const query: any = {
        school: schoolId,
        page: 1,
        limit: 1,
      };

      if (role) query.role = role;
      if (isClass) {
        // For classes, we need to filter by createdAt <= targetDate
        // Assuming your services support `createdBefore`
        query.createdBefore = targetDate.toISOString();
      } else {
        query.createdBefore = targetDate.toISOString();
      }

      const res: any = isClass
        ? await this.classesService.findAll(query)
        : isStudent
          ? await this.studentsService.findStudents(query)
          : await this.usersService.findAll(query);

      return isStudent ? res.meta.total : res.total;
    };

    for (let i = weeks - 1; i >= 0; i--) {
      const [s, t, c, st] = await Promise.all([
        getCountForWeek(i, Role.STUDENT, false, true),
        getCountForWeek(i, Role.TEACHER),
        getCountForWeek(i, undefined, true),
        getCountForWeek(i, [Role.STAFF, Role.HEADTeacher, Role.ADMIN]),
      ]);

      series.push({
        date: `Week ${weeks - i}`,
        'Total Students': s,
        Teachers: t,
        Classes: c,
        'Staff Members': st,
      });
    }

    // -------------------------------------------------
    // 3. MoM calculations (current vs 4 weeks ago)
    // -------------------------------------------------
    const prevIndex = series.findIndex((s) => s.date === 'Week 4');
    const currIndex = series.findIndex((s) => s.date === 'Week 7');

    const prev = prevIndex >= 0 ? series[prevIndex] : series[0];
    const curr = currIndex >= 0 ? series[currIndex] : series[series.length - 1];

    const calcChange = (
      curr: number,
      prev: number,
    ): { diff: string; pct: string } => {
      const diff = curr - prev;
      const pct =
        prev === 0 ? (curr > 0 ? 100 : 0) : Math.round((diff / prev) * 100);
      return {
        diff: diff >= 0 ? `+${diff}` : `${diff}`,
        pct: pct >= 0 ? `+${pct}%` : `${pct}%`,
      };
    };

    const studentsChange = calcChange(
      curr['Total Students'],
      prev['Total Students'],
    );
    const teachersChange = calcChange(curr.Teachers, prev.Teachers);
    const classesChange = calcChange(curr.Classes, prev.Classes);
    const staffChange = calcChange(
      curr['Staff Members'],
      prev['Staff Members'],
    );

    // -------------------------------------------------
    // 4. Return shape matching frontend
    // -------------------------------------------------
    return {
      totalStudents,
      studentsMoM: studentsChange.diff,
      studentsMoMPercent: studentsChange.pct,

      totalTeachers,
      teachersMoM: teachersChange.diff,
      teachersMoMPercent: teachersChange.pct,

      totalClasses,
      classesMoM: classesChange.diff,
      classesMoMPercent: classesChange.pct,

      totalStaffMembers,
      staffMoM: staffChange.diff,
      staffMoMPercent: staffChange.pct,

      series,
    };
  }

  async getRegistrationAnalytics(
    schoolId: string,
  ): Promise<RegistrationAnalyticsDto> {
    const now = new Date();
    const schoolObjectId = new Types.ObjectId(schoolId);

    // Helper: generate monthly series
    const generateSeries = async (
      months: number,
    ): Promise<TimeSeriesItem[]> => {
      const items: TimeSeriesItem[] = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(now, i);
        const start = startOfMonth(date);
        const end = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
        );

        const [studentCount, teacherCount, staffCount] = await Promise.all([
          this.studentModel.countDocuments({
            school: schoolObjectId,
            createdAt: { $gte: start, $lte: end },
          }),

          this.userModel.countDocuments({
            school: schoolObjectId,
            role: Role.TEACHER,
            createdAt: { $gte: start, $lte: end },
          }),

          this.userModel.countDocuments({
            school: schoolObjectId,
            role: { $in: [Role.STAFF, Role.HEADTeacher, Role.ADMIN] },
            createdAt: { $gte: start, $lte: end },
          }),
        ]);

        items.push({
          month: format(date, 'MMM'),
          students: studentCount,
          teachers: teacherCount,
          staff: staffCount,
        });
      }

      return items; // oldest → newest
    };

    const [last3Months, last6Months, last12Months] = await Promise.all([
      generateSeries(3),
      generateSeries(6),
      generateSeries(12),
    ]);

    // Trend: last 12 months vs previous 12 months
    const last12Total = last12Months.reduce(
      (sum, m) => sum + m.students + m.teachers + m.staff,
      0,
    );

    const prev12Start = subMonths(now, 24);
    const prev12End = subMonths(now, 12);

    const [prevStudents, prevTeachers, prevStaff] = await Promise.all([
      this.studentModel.countDocuments({
        school: schoolObjectId,
        createdAt: { $gte: prev12Start, $lte: prev12End },
      }),
      this.userModel.countDocuments({
        school: schoolObjectId,
        role: Role.TEACHER,
        createdAt: { $gte: prev12Start, $lte: prev12End },
      }),
      this.userModel.countDocuments({
        school: schoolObjectId,
        role: { $in: [Role.STAFF, Role.HEADTeacher, Role.ADMIN] },
        createdAt: { $gte: prev12Start, $lte: prev12End },
      }),
    ]);

    const prev12Total = prevStudents + prevTeachers + prevStaff;
    const trendPct =
      prev12Total === 0
        ? last12Total > 0
          ? 100
          : 0
        : Math.round(((last12Total - prev12Total) / prev12Total) * 100);

    const trend = {
      change: trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`,
      label: `Trending ${trendPct >= 0 ? 'up' : 'down'} by ${Math.abs(trendPct)}% this period`,
    };

    // Gender Distribution (Current Academic Year: Sep 1 → Now)
    const academicYearStart = new Date(now.getFullYear(), 8, 1); // September 1st

    const genderStats = await this.studentModel.aggregate([
      {
        $match: {
          school: schoolObjectId,
          createdAt: { $gte: academicYearStart },
        },
      },
      {
        $group: {
          _id: { $ifNull: [{ $toLower: '$gender' }, 'other'] },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalStudents = genderStats.reduce((sum, g) => sum + g.count, 0) || 1;

    const genderDistribution: GenderDistributionItem[] = [
      'male',
      'female',
      'other',
    ].map((g) => {
      const found = genderStats.find((x) => x._id === g);
      const count = found?.count || 0;
      return {
        gender: g as any,
        count,
        percentage: ((count / totalStudents) * 100).toFixed(1) + '%',
      };
    });

    return {
      timeSeries: { last3Months, last6Months, last12Months },
      trend,
      genderDistribution,
    };
  }


  async getPerformanceAnalytics(
    query: PerformanceQueryDto,
  ): Promise<SchoolPerformanceAnalyticsDto> {
    const { schoolId, classId, academicYear, termId, scope = 'all' } = query;

    // Build base match
    const match: any = {};
    if (schoolId) match['student.school'] = new Types.ObjectId(schoolId);
    if (classId) match['class'] = new Types.ObjectId(classId);
    if (academicYear) match.academicYear = academicYear;
    if (termId) match.term = new Types.ObjectId(termId);

    // Get all relevant marks
    const marks = await this.marksModel.aggregate([
      {
        $lookup: {
          from: 'students',
          localField: 'student',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'class',
        },
      },
      { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
      { $match: match },
      {
        $group: {
          _id: {
            academicYear: '$academicYear',
            term: '$term',
            class: '$class._id',
            student: '$student._id',
            subject: '$subject',
          },
          totalScore: { $sum: '$score' },
          totalPossible: { $sum: '$maxScore' },
          assessments: { $push: '$$ROOT' },
        },
      },
      {
        $group: {
          _id: {
            academicYear: '$_id.academicYear',
            term: '$_id.term',
            class: '$_id.class',
            student: '$_id.student',
          },
          subjects: {
            $push: {
              subject: '$_id.subject',
              average: {
                $cond: [
                  { $eq: ['$totalPossible', 0] },
                  0,
                  { $multiply: [{ $divide: ['$totalScore', '$totalPossible'] }, 100] },
                ],
              },
              totalScore: '$totalScore',
              totalPossible: '$totalPossible',
              count: { $size: '$assessments' },
            },
          },
          totalScore: { $sum: '$totalScore' },
          totalPossible: { $sum: '$totalPossible' },
          assessmentCount: { $sum: { $size: '$assessments' } },
        },
      },
      {
        $addFields: {
          average: {
            $cond: [
              { $eq: ['$totalPossible', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$totalScore', '$totalPossible'] }, 100] }, 1] },
            ],
          },
        },
      },
    ]);

    // Populate metadata
    const academicYears = await this.academicYearModel.find().lean();
    const terms = await this.termModel.find().lean();
    const classes = await this.classModel.find().lean();
    const students = await this.studentModel.find().lean();

    const classMap = Object.fromEntries(classes.map(c => [c._id.toString(), c]));
    const studentMap = Object.fromEntries(students.map(s => [s._id.toString(), s]));
    const termMap = Object.fromEntries(terms.map(t => [t._id.toString(), t]));

    // Build response
    const result: SchoolPerformanceAnalyticsDto = {
      schoolId: schoolId || 'all',
      academicYears: [],
    };

    const yearMap = new Map<string, AcademicYearPerformanceDto>();

    marks.forEach(m => {
      const yearKey = m._id.academicYear;
      const termKey = m._id.term?.toString();
      const classKey = m._id.class?.toString();
      const studentKey = m._id.student.toString();

      if (!yearMap.has(yearKey)) {
        yearMap.set(yearKey, {
          academicYear: yearKey,
          terms: [],
          overallAverage: 0,
          totalStudents: 0,
          totalAssessments: 0,
        });
      }

      const yearData = yearMap.get(yearKey)!;
      let termData = yearData.terms.find(t => t.termId === termKey);
      if (!termData && termKey) {
        termData = {
          termId: termKey,
          termName: termMap[termKey]?.name || 'Unknown',
          startDate: termMap[termKey]?.startDate ?? undefined,
          endDate: termMap[termKey]?.endDate ?? undefined,
          classes: [],
          overallAverage: 0,
          totalStudents: 0,
          totalAssessments: 0,
        };
        if(termData) yearData.terms.push(termData);
      }

      let classData = termData?.classes.find(c => c.classId === classKey);
      if (!classData && classKey) {
        classData = {
          classId: classKey,
          className: classMap[classKey]?.name || 'Unknown',
          gradeLevel: classMap[classKey]?.gradeLevel || '',
          totalStudents: 0,
          averageScore: 0,
          subjectBreakdown: [],
        };
        termData!.classes.push(classData);
      }

      const studentPerf: StudentPerformanceDto = {
        studentId: studentKey,
        name: studentMap[studentKey]?.name || 'Unknown',
        totalMarks: m.totalScore,
        totalPossible: m.totalPossible,
        average: m.average,
        grade: this.getGrade(m.average),
      };

      classData!.totalStudents++;
      classData!.averageScore = ((classData!.averageScore * (classData!.totalStudents - 1)) + m.average) / classData!.totalStudents;
      termData!.totalAssessments += m.assessmentCount;
      yearData.totalAssessments += m.assessmentCount;
    });

    // Finalize averages and ranks
    yearMap.forEach(year => {
      year.terms.forEach(term => {
        term.classes.forEach(cls => {
          cls.averageScore = Number(cls.averageScore.toFixed(1));
        });
        term.overallAverage = Number(
          (term.classes.reduce((s, c) => s + c.averageScore, 0) / term.classes.length || 0).toFixed(1),
        );
      });
      year.overallAverage = Number(
        (year.terms.reduce((s, t) => s + t.overallAverage, 0) / year.terms.length || 0).toFixed(1),
      );
    });

    result.academicYears = Array.from(yearMap.values());

    // Add all-time summary if scope allows
    if (scope === 'all') {
      const allMarks = await this.marksModel.aggregate([
        { $match: schoolId ? { 'student.school': new Types.ObjectId(schoolId) } : {} },
        {
          $group: {
            _id: null,
            totalScore: { $sum: '$score' },
            totalPossible: { $sum: '$maxScore' },
          },
        },
      ]);

      const all = allMarks[0];
      result.allTime = {
        overallAverage: all ? Number(((all.totalScore / all.totalPossible) * 100).toFixed(1)) : 0,
        totalStudents: await this.studentModel.countDocuments(
          schoolId ? { school: schoolId } : {},
        ),
        totalAssessments: await this.marksModel.countDocuments(
          schoolId ? { 'student.school': schoolId } : {},
        ),
      };
    }

    return result;
  }

  private getGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }
}
