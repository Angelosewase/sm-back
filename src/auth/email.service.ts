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
    await this.transporter.sendMail({
      from:
        this.configService.get<string>('SMTP_FROM') || 'noreply@example.com',
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
}
