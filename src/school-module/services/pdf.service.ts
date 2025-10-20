import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
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

  buildClassPerformanceHtml(params: {
    schoolName: string;
    className: string;
    academicYear: string;
    students: any[];
    subjects: any[];
  }) {
    const { schoolName, className, academicYear, students, subjects } = params;
    // simple table layout inspired by provided screenshot
    const header = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #000;">
        <div>
          <h3 style="margin:0">${schoolName}</h3>
          <div>Academic Year : ${academicYear}</div>
          <div>Class: ${className}</div>
        </div>
        <div style="text-align:center">
          <h2 style="margin:0">TRANSCRIPT</h2>
        </div>
        <div style="width:120px;height:120px;background:#f2f2f2;border:1px solid #ddd"></div>
      </div>
    `;

    const subjectHeaders = subjects
      .map(
        (s) => `<th style="border:1px solid #000;padding:4px">${s.name}</th>`,
      )
      .join('');

    const rows = students
      .map((st) => {
        const scores = subjects
          .map(
            (sub) =>
              `<td style="border:1px solid #000;padding:4px;text-align:center">${st.scores?.[sub._id] ?? ''}</td>`,
          )
          .join('');
        return `<tr><td style="border:1px solid #000;padding:4px">${st.name}</td>${scores}<td style="border:1px solid #000;padding:4px;text-align:center">${st.total ?? ''}</td><td style="border:1px solid #000;padding:4px;text-align:center">${st.percentage ?? ''}</td></tr>`;
      })
      .join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; font-size:12px }
            table { border-collapse: collapse; width:100% }
          </style>
        </head>
        <body>
          ${header}
          <div style="padding:12px">
            <table>
              <thead>
                <tr>
                  <th style="border:1px solid #000;padding:6px">Student</th>
                  ${subjectHeaders}
                  <th style="border:1px solid #000;padding:6px">Total</th>
                  <th style="border:1px solid #000;padding:6px">%</th>
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
}
