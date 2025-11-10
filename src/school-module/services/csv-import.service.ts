import { Injectable, BadRequestException } from '@nestjs/common';
import { StudentService } from '../../students/student.service';
import { parse } from 'csv-parse/sync';

@Injectable()
export class CsvImportService {
  constructor(private readonly studentService: StudentService) {}

  async importStudentsCsv(buffer: Buffer, schoolId?: string) {
    const text = buffer.toString('utf8');
    try {
      const parsed = await parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      const results = [] as any[];
      for (const r of parsed) {
        try {
          const dto = {
            studentId: r.studentId || r.student_id || r.id,
            firstName: r.firstName || r.first_name || r.firstname || r.first,
            lastName: r.lastName || r.last_name || r.lastname || r.last,
            otherNames: r.otherNames || r.other_names || r.other,
            gender: r.gender || 'unknown',
            dob: r.dob ? new Date(r.dob) : undefined,
            admissionDate: r.admissionDate
              ? new Date(r.admissionDate)
              : undefined,
            school: schoolId || r.school || undefined,
          };
          const created = await this.studentService.registerStudent(dto as any);
          results.push({ ok: true, student: created });
        } catch (e: any) {
          results.push({ ok: false, error: e?.message || String(e), row: r });
        }
      }
      return results;
    } catch (err) {
      throw new BadRequestException(
        'CSV parse error: ' + (err?.message || err),
      );
    }
  }
}
