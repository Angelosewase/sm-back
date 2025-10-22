import { Injectable, Inject } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { UsersService } from 'src/users/users.service';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ClassService } from './class.service';

/**
 * Small in-memory cache helper. Kept simple (per-process) and intended for short-lived
 * PDF generation requests. If you need cross-process caching use Redis or similar.
 */
class SimpleCache<T> {
  private map = new Map<string, { ts: number; v: T }>();
  constructor(private ttlMs = 5 * 60 * 1000) {}
  get(key: string) {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.map.delete(key);
      return null;
    }
    return entry.v;
  }
  set(key: string, value: T) {
    this.map.set(key, { ts: Date.now(), v: value });
  }
}

@Injectable()
export class PdfService {
  private userCache = new SimpleCache<any>(10 * 60 * 1000);

  constructor(
    private readonly usersService: UsersService,
    private readonly classService: ClassService,
  ) {}

  async generatePdfFromHtml(html: string, options?: puppeteer.PDFOptions) {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        ...(options || {}),
      });
      return pdf;
    } finally {
      await browser.close();
    }
  }

  /**
   * Build a simple table matching the screenshot: Subject | 1st Quarter | 2nd Quarter | 3rd Quarter | 4th Quarter
   * Expects subjects array: [{ subjectId, subjectName, quarterAverages: { q1,q2,q3,q4 } }]
   */
  buildClassQuarterHtml(params: {
    schoolName: string;
    className: string;
    academicYear: string;
    avatarDataUri?: string | null;
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      quarterAverages: {
        q1?: number | null;
        q2?: number | null;
        q3?: number | null;
        q4?: number | null;
      };
    }>;
  }) {
    const { schoolName, className, academicYear, subjects, avatarDataUri } =
      params;

    const header = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:2px solid #2b8db3;background:#f7fbfd;">
        <div style="font-family:Arial,Helvetica,sans-serif;color:#154a5d">
          <div style="font-size:16px;font-weight:700">${escapeHtml(schoolName)}</div>
          <div style="font-size:12px;margin-top:4px">Academic Year: ${escapeHtml(academicYear)}</div>
          <div style="font-size:12px">Class: ${escapeHtml(className)}</div>
        </div>
        <div style="text-align:center;color:#154a5d">
          <div style="font-size:18px;font-weight:700">Class Summary</div>
        </div>
        <div style="width:80px;height:80px;background:#fff;border:1px solid #e6eef2;display:flex;align-items:center;justify-content:center">
          ${avatarDataUri ? `<img src="${avatarDataUri}" style="max-width:72px;max-height:72px;border-radius:6px"/>` : ''}
        </div>
      </div>
    `;

    const rows = subjects
      .map((s) => {
        const q = s.quarterAverages || {};
        return `
          <tr>
            <td style="padding:8px 10px;border:1px solid #cfe6ef">${escapeHtml(s.subjectName)}</td>
            <td style="padding:8px 10px;border:1px solid #cfe6ef;text-align:center">${q.q1 ?? ''}</td>
            <td style="padding:8px 10px;border:1px solid #cfe6ef;text-align:center">${q.q2 ?? ''}</td>
            <td style="padding:8px 10px;border:1px solid #cfe6ef;text-align:center">${q.q3 ?? ''}</td>
            <td style="padding:8px 10px;border:1px solid #cfe6ef;text-align:center">${q.q4 ?? ''}</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#111 }
            table { border-collapse: collapse; width:100%; margin-top:12px }
            th { background:#2b8db3;color:#fff;padding:10px;border:1px solid #bcdfea }
            td { background:#fff;padding:8px }
          </style>
        </head>
        <body>
          ${header}
          <div style="padding:12px">
            <table>
              <thead>
                <tr>
                  <th style="text-align:left">Subject</th>
                  <th>1st Quarter</th>
                  <th>2nd Quarter</th>
                  <th>3rd Quarter</th>
                  <th>4th Quarter</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
    return html;
  }

  /**
   * Resolve multiple user ids to a map of id -> user (lean). Results are cached in-process
   * to avoid repeated DB lookups during PDF generation.
   */
  async resolveUsers(ids: string[]) {
    const result: Record<string, any> = {};
    const toFetch: string[] = [];
    ids = (ids || []).filter(Boolean).map((i) => i.toString());
    const uniq = Array.from(new Set(ids));
    for (const id of uniq) {
      const cached = this.userCache.get(id);
      if (cached) result[id] = cached;
      else toFetch.push(id);
    }
    if (toFetch.length) {
      const users = await this.usersService.findByIds(toFetch as string[]);
      for (const u of users) {
        const id = String((u as any)._id || (u as any).id);
        result[id] = u as any;
        this.userCache.set(id, u as any);
      }
    }
    return result;
  }

  /**
   * Resolve and cache student info for generating student reports. Returns a simple object with name, id, maybe class
   */
  async resolveStudentInfo(studentId: string) {
    const cached = this.userCache.get(studentId);
    if (cached) return cached;
    const users = await this.usersService.findByIds([studentId]);
    const u = (users && users[0]) || null;
    this.userCache.set(studentId, u);
    return u;
  }

  async loadAvatarDataUri(avatarPath?: string) {
    try {
      if (!avatarPath) return null;
      const full = avatarPath.startsWith('/')
        ? avatarPath
        : join(process.cwd(), avatarPath);
      if (!existsSync(full)) return null;
      const buf = readFileSync(full);
      // try to infer mime from extension
      const ext = full.split('.').pop() || 'png';
      const mime =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'gif'
            ? 'image/gif'
            : 'image/png';
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (e) {
      return null;
    }
  }

  /**
   * Build a student report using similar visual style to the class PDF. Shows each subject with CAT/EXAM/TOT per term, totals, percentage and grade area.
   * Input: report object returned from MarksService.getStudentAcademicReport
   */
  async buildStudentReportHtml(
    report: any & { studentName?: string; avatarDataUri?: string | null },
  ) {
    const {
      studentName,
      academicYear,
      classId,
      subjects,
      overall,
      avatarDataUri,
    } = report;
    let class_name = await this.classService.getClassName(classId);
    const header = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:2px solid #222;">
        <div>
          <h2 style="margin:0">${escapeHtml(studentName || 'Student')}</h2>
          <div style="font-size:12px">Academic Year: ${escapeHtml(academicYear)}</div>
          <div style="font-size:12px">Class: ${escapeHtml(class_name || '')}</div>
        </div>
        <div style="text-align:center">
          <h3 style="margin:0">STUDENT TRANSCRIPT</h3>
        </div>
        <div style="width:80px;height:80px;background:#f7f7f7;border:1px solid #ddd;display:flex;align-items:center;justify-content:center">
          ${avatarDataUri ? `<img src="${avatarDataUri}" style="max-width:72px;max-height:72px;border-radius:6px"/>` : ''}
        </div>
      </div>
    `;

    // Build table header for terms (First Term CAT/EXAM/TOT, etc.)
    const termHeader = `
      <tr>
        <th style="border:1px solid #bcdfea;padding:6px">COURSES</th>
        <th style="border:1px solid #bcdfea;padding:6px">CAT</th>
        <th style="border:1px solid #bcdfea;padding:6px">EXAM</th>
        <th style="border:1px solid #bcdfea;padding:6px">TOT</th>
        <th style="border:1px solid #bcdfea;padding:6px">CAT</th>
        <th style="border:1px solid #bcdfea;padding:6px">EXAM</th>
        <th style="border:1px solid #bcdfea;padding:6px">TOT</th>
        <th style="border:1px solid #bcdfea;padding:6px">CAT</th>
        <th style="border:1px solid #bcdfea;padding:6px">EXAM</th>
        <th style="border:1px solid #bcdfea;padding:6px">TOT</th>
        <th style="border:1px solid #bcdfea;padding:6px">CAT</th>
        <th style="border:1px solid #bcdfea;padding:6px">EXAM</th>
        <th style="border:1px solid #bcdfea;padding:6px">TOT</th>
        <th style="border:1px solid #bcdfea;padding:6px">TOTAL</th>
        <th style="border:1px solid #bcdfea;padding:6px">%</th>
        <th style="border:1px solid #bcdfea;padding:6px">GRADE</th>
      </tr>
    `;

    const rows = (subjects || [])
      .map((s: any) => {
        const t = s.terms || {};
        const q1 = t.q1 || { cat: '', exam: '', tot: '' };
        const q2 = t.q2 || { cat: '', exam: '', tot: '' };
        const q3 = t.q3 || { cat: '', exam: '', tot: '' };
        const q4 = t.q4 || { cat: '', exam: '', tot: '' };
        return `
          <tr>
            <td style="padding:6px;border:1px solid #ddd">${escapeHtml(s.subjectName)}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q1.cat ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q1.exam ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q1.tot ?? ''}</td>

            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q2.cat ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q2.exam ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q2.tot ?? ''}</td>

            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q3.cat ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q3.exam ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q3.tot ?? ''}</td>

            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q4.cat ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q4.exam ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${q4.tot ?? ''}</td>

            <td style="padding:6px;border:1px solid #ddd;text-align:center">${s.total ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center">${s.percentage ?? ''}</td>
            <td style="padding:6px;border:1px solid #ddd;text-align:center"></td>
          </tr>
        `;
      })
      .join('');

    const footer = `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;font-weight:700">Total</td>
        <td colspan="12" style="padding:6px;border:1px solid #ddd"></td>
        <td style="padding:6px;border:1px solid #ddd;font-weight:700">${overall?.total ?? ''}</td>
        <td style="padding:6px;border:1px solid #ddd;font-weight:700">${overall?.percentage ?? ''}</td>
        <td style="padding:6px;border:1px solid #ddd"></td>
      </tr>
    `;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; font-size:12px; }
            table { border-collapse: collapse; width:100%; margin-top:12px }
            th { background:#2b8db3;color:#fff;padding:8px }
            td { padding:6px }
          </style>
        </head>
        <body>
          ${header}
          <div style="padding:12px">
            <table>
              <thead>${termHeader}</thead>
              <tbody>
                ${rows}
                ${footer}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;
    return html;
  }

  /**
   * Prepare an HTML report for the class performance. This will try to present subjects
   * in vertical columns so subject names get more horizontal space when they are long.
   * Subjects are chunked into N columns depending on how many subjects there are.
   */
  buildClassPerformanceHtml(params: {
    schoolName: string;
    className: string;
    academicYear: string;
    students: any[]; // { name, scores: { [subjectId]: score }, total, percentage }
    subjects: any[]; // { _id, name }
  }) {
    const { schoolName, className, academicYear, students, subjects } = params;

    // header
    const header = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:2px solid #222;">
        <div>
          <h1 style="margin:0;font-size:18px">${schoolName}</h1>
          <div style="font-size:12px;margin-top:4px">Academic Year: ${academicYear}</div>
          <div style="font-size:12px">Class: ${className}</div>
        </div>
        <div style="text-align:center">
          <h2 style="margin:0;font-size:20px">CLASS PERFORMANCE</h2>
        </div>
        <div style="width:110px;height:110px;background:#f7f7f7;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999">Logo</div>
      </div>
    `;

    // Decide columns: aim for 5-6 subjects per column on A4 for readable font
    const subjectsPerColumn = Math.max(5, Math.ceil(subjects.length / 3));
    const columns: any[][] = [];
    for (let i = 0; i < subjects.length; i += subjectsPerColumn) {
      columns.push(subjects.slice(i, i + subjectsPerColumn));
    }

    // Build subject column blocks (vertical lists). Each column will show subject name and average under it.
    const subjectColumnsHtml = columns
      .map((col) => {
        const items = col
          .map(
            (s) =>
              `<div style="padding:6px 4px;border-bottom:1px solid #eee;font-size:11px">${escapeHtml(s.name)}</div>`,
          )
          .join('');
        return `<div style="flex:1;min-width:140px;margin-right:8px;border:1px solid #f0f0f0">${items}</div>`;
      })
      .join('');

    // Student rows: we will show name and a compact representation of scores under each column subset.
    const studentRowsHtml = students
      .map((st) => {
        // For each column, render a mini-table of the subset of subjects
        const colsHtml = columns
          .map((col) => {
            const cells = col
              .map(
                (s) =>
                  `<div style="padding:6px 4px;border-bottom:1px solid #f5f5f5;font-size:11px;text-align:center">${st.scores?.[s._id] ?? ''}</div>`,
              )
              .join('');
            return `<div style="flex:1;min-width:140px;margin-right:8px;border:1px solid #f9f9f9">${cells}</div>`;
          })
          .join('');

        return `
          <div style="display:flex;border-bottom:1px solid #ddd;padding:6px 0;align-items:stretch">
            <div style="width:220px;padding:6px 8px">${escapeHtml(st.name)}</div>
            ${colsHtml}
            <div style="width:80px;padding:6px 8px;text-align:center">${st.total ?? ''}</div>
            <div style="width:60px;padding:6px 8px;text-align:center">${st.percentage ?? ''}</div>
          </div>
        `;
      })
      .join('');

    const legend = `<div style="margin-top:12px;font-size:10px;color:#444">Generated on ${new Date().toLocaleString()}</div>`;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; font-size:12px; color:#222; }
            .container { padding:12px }
            .subjects-row { display:flex; gap:8px; margin-top:12px }
            .students-list { margin-top:8px }
          </style>
        </head>
        <body>
          ${header}
          <div class="container">
            <div style="display:flex;align-items:flex-start">
              <div style="width:220px;font-weight:600">Student</div>
              <div style="flex:1;display:flex">${subjectColumnsHtml}</div>
              <div style="width:80px;text-align:center;font-weight:600">Total</div>
              <div style="width:60px;text-align:center;font-weight:600">%</div>
            </div>

            <div class="students-list">
              ${studentRowsHtml}
            </div>

            ${legend}
          </div>
        </body>
      </html>
    `;

    return html;
  }
}

function escapeHtml(s: any) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
