import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';

export interface PrimaryReportContext {
  assets?: {
    logoPath?: string;
  };
  school?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  student: {
    fullName: string;
    class?: string | null;
    additionalInfo?: string | null;
  };
  report: {
    title: string;
    periodLabel?: string | null;
    period?: string | null;
  };
  // Single-term subjects (nursery and primary term view)
  subjects?: Array<{
    name: string;
    maximum: string | number;
    obtained: string | number;
    grade: string;
    comment: string;
  }>;
  // Multi-term layout for primary year view
  yearView?: {
    terms: Array<{ label: string }>;
    subjects: Array<{
      name: string;
      byTerm: Array<{
        maximum: string | number;
        obtained: string | number;
        grade: string;
      }>;
    }>;
    overall?: {
      percentage?: string | null;
      notes?: string | null;
    };
  };
  summary?: {
    percentageLabel?: string | null;
    percentage?: string | null;
    notes?: string | null;
  };
  teacher: {
    name?: string | null;
    additionalNotes?: string | null;
  };
}

@Injectable()
export class ReportsPdfService {
  private readonly logger = new Logger(ReportsPdfService.name);
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>();

  async renderPrimarySchoolReport(context: PrimaryReportContext): Promise<Buffer> {
    const template = await this.loadTemplate('primary-school-report.hbs');
    const html = template(context);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('screen');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });
      await page.close();
      return Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to render primary school report', error as Error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async renderNurserySchoolReport(context: PrimaryReportContext): Promise<Buffer> {
    const template = await this.loadTemplate('nurserly-report.hbs');
    const html = template(context);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.emulateMediaType('screen');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });
      await page.close();
      return Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer
        : Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error('Failed to render nursery school report', error as Error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  private async loadTemplate(fileName: string): Promise<HandlebarsTemplateDelegate> {
    if (this.templateCache.has(fileName)) {
      return this.templateCache.get(fileName) as HandlebarsTemplateDelegate;
    }

    const templatePath = await this.resolveTemplatePath(fileName);
    const fileContents = await fs.readFile(templatePath, 'utf8');
    const compiled = Handlebars.compile(fileContents);

    this.templateCache.set(fileName, compiled);
    return compiled;
  }

  private async resolveTemplatePath(fileName: string): Promise<string> {
    const candidatePaths = [
      path.resolve(__dirname, 'templates', fileName),
      path.resolve(process.cwd(), 'src', 'reports', 'templates', fileName),
    ];

    for (const candidate of candidatePaths) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // continue trying next candidate
      }
    }

    throw new Error(`Template "${fileName}" could not be found in known locations.`);
  }
}
