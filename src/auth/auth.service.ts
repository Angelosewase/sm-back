import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { Role } from 'src/users/schemas/user.schema';
import { School } from 'src/school-module/schemas/school.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,

    private jwtService: JwtService,
    private emailService: EmailService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) {}

  // Login Flow
  async login(email: string, password: string) {
    let _school: School | null = null
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.school) {
      _school = await this.usersService.getUserSchool(
        user.school?.toString(),
      );
      if (!_school && user.role !== Role.ADMIN) {
        throw new UnauthorizedException('You are not assigned in any school');
      }
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user._id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      school: {
        id: _school?._id,
        name: _school?.name,
      },
    };
  }

  // Password Reset Flow - Step 1: Request Reset
  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in cache with 15 min expiration
    const cacheKey = `otp:${email}`;
    await this.cacheManager.set(cacheKey, otp, 900000); // 15 minutes in milliseconds

    // Send OTP via email
    await this.emailService.sendOtpEmail(email, otp);

    return {
      message: 'OTP sent to your email',
    };
  }

  // Password Reset Flow - Step 2: Verify OTP
  async verifyOtp(email: string, otp: string) {
    const cacheKey = `otp:${email}`;
    const cachedOtp = await this.cacheManager.get<string>(cacheKey);

    if (!cachedOtp || cachedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Generate temporary reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenKey = `reset:${resetToken}`;

    // Store reset token with email for 15 minutes
    await this.cacheManager.set(resetTokenKey, email, 900000);

    // Delete used OTP
    await this.cacheManager.del(cacheKey);

    return {
      resetToken,
      message: 'OTP verified successfully',
    };
  }

  // Password Reset Flow - Step 3: Reset Password
  async resetPassword(resetToken: string, newPassword: string) {
    const resetTokenKey = `reset:${resetToken}`;
    const email = await this.cacheManager.get<string>(resetTokenKey);

    if (!email) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Update password
    await this.usersService.updatePassword(
      (user as any)._id.toString(),
      newPassword,
    );

    // Invalidate reset token
    await this.cacheManager.del(resetTokenKey);

    return {
      message: 'Password reset successfully',
    };
  }

  // Validate user for protected routes
  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
