import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: this.configService.get<string>('SMTP_SERVICE'),
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <h1>Password Reset Request</h1>
        <p>Your OTP code is: <strong>${otp}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }

  async sendTeacherWelcomeEmail(email: string, name?: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Welcome to the Teaching Team',
      html: `
        <h1>Welcome${name ? `, ${name}` : ''}!</h1>
        <p>You have been registered as a teacher on the School Management platform.</p>
        <p>Please log in using your email address to explore your dashboard.</p>
        <p>If you have any questions, reach out to the administration team.</p>
      `,
    });
  }

  async sendStaffWelcomeEmail(email: string, name?: string): Promise<void> {
    await this.sendMail({
      to: email,
      subject: 'Welcome to the Staff Portal',
      html: `
        <h1>Welcome${name ? `, ${name}` : ''}!</h1>
        <p>You have been added as a staff member to the School Management platform.</p>
        <p>Log in with your credentials to get started.</p>
        <p>If you need assistance, please contact support.</p>
      `,
    });
  }

  private async sendMail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }) {
    await this.transporter.sendMail({
      from:
        this.configService.get<string>('SMTP_FROM') || 'noreply@example.com',
      to,
      subject,
      html,
    });
  }
}
