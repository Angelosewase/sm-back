// analytics.dto.ts
export interface TimeSeriesItem {
  month: string; // "Jan", "Feb", ...
  students: number;
  teachers: number;
  staff: number;
}

export interface GenderDistributionItem {
  gender: 'male' | 'female' | 'other';
  count: number;
  percentage: string;
}

export interface AnalyticsResponseDto {
  // Time-series (last 3/6/12 months)
  timeSeries: {
    last3Months: TimeSeriesItem[];
    last6Months: TimeSeriesItem[];
    last12Months: TimeSeriesItem[];
  };

  // Overall trend
  trend: {
    change: string; // "+8.7%"
    label: string; // "Trending up by 8.7% this period"
  };

  // Gender distribution (current academic year)
  genderDistribution: GenderDistributionItem[];
}

export interface RegistrationAnalyticsDto {
  timeSeries: {
    last3Months: TimeSeriesItem[];
    last6Months: TimeSeriesItem[];
    last12Months: TimeSeriesItem[];
  };
  trend: {
    change: string;
    label: string;
  };
  genderDistribution: GenderDistributionItem[];
}

// analytics.dto.ts
export interface StudentPerformanceDto {
  studentId: string;
  name: string;
  totalMarks: number;
  totalPossible: number;
  average: number; // 0-100
  grade?: string;
  rank?: number;
}

export interface ClassPerformanceDto {
  classId: string;
  className: string;
  gradeLevel: string;
  totalStudents: number;
  averageScore: number;
  topStudent?: StudentPerformanceDto;
  lowestStudent?: StudentPerformanceDto;
  subjectBreakdown: SubjectPerformanceDto[];
}

export interface SubjectPerformanceDto {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  totalAssessments: number;
  completed: number;
}

export interface TermPerformanceDto {
  termId: string;
  termName: string;
  startDate?: Date;
  endDate?: Date;
  classes: ClassPerformanceDto[];
  overallAverage: number;
  totalStudents: number;
  totalAssessments: number;
}

export interface AcademicYearPerformanceDto {
  academicYear: string;
  terms: TermPerformanceDto[];
  overallAverage: number;
  totalStudents: number;
  totalAssessments: number;
}

export interface SchoolPerformanceAnalyticsDto {
  schoolId: string;
  academicYears: AcademicYearPerformanceDto[];
  allTime?: {
    overallAverage: number;
    totalStudents: number;
    totalAssessments: number;
  };
}

export interface HeadTeacherSubjectStatsDto {
  totalSubjects: number;
  totalTeachers: number;
  averageClassSize: number;
  averagePerformance: number; // 0-100 (percentage)
  performanceGrade: string;
  schoolId: string;
}
