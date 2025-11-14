// admin-stats.dto.ts
export interface AdminStatsDto {
  totalStudents: number;
  studentsMoM: string;
  studentsMoMPercent: string;

  totalTeachers: number;
  teachersMoM: string;
  teachersMoMPercent: string;

  totalClasses: number;
  classesMoM: string;
  classesMoMPercent: string;

  totalStaffMembers: number;
  staffMoM: string;
  staffMoMPercent: string;

  // historic series for the line charts inside StatCard
  series: Array<{
    date: string;
    'Total Students': number;
    Teachers: number;
    Classes: number;
    'Staff Members': number;
  }>;
}