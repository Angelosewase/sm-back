import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { EmailService } from './email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { Role } from 'src/users/schemas/user.schema';
import { School } from '../school/entities/school.entity';
import { RegistrationTokensService } from '../registration-tokens/registration-tokens.service';
import { SchoolService } from '../school/school.service';
import { RegisterWithTokenDto } from '../registration-tokens/dto/register-with-token.dto';
import { CreateSchoolDto } from '../school/dto/create-school.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private registrationTokensService: RegistrationTokensService,
    private schoolService: SchoolService,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
  ) {}

  // Login Flow
  async login(email: string, password: string) {
    let _school: School | null = null;
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

    const schoolPayload = _school
      ? {
          id: _school._id,
          name: _school.name,
          schoolType: _school.schoolType,
          establishedYear: _school.establishedYear,
          studentCapacity: _school.studentCapacity,
          description: _school.description,
          address: _school.address,
          city: _school.city,
          district: _school.district,
          phoneNumber: _school.phoneNumber,
          email: _school.email,
          website: _school.website,
        }
      : null;

    return {
      accessToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      school: schoolPayload,
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

  async updateUserPassword(userId: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.updatePassword(userId, newPassword);
    return { message: 'Password updated successfully' };
  }

  // Validate user for protected routes
  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  // Register with token
  async registerWithToken(registerDto: RegisterWithTokenDto, ipAddress?: string) {
    // Validate token
    const token = await this.registrationTokensService.validateToken(registerDto.token);

    // Create user with role from token
    const userData = {
      email: registerDto.email,
      password: registerDto.password,
      name: registerDto.name,
      phone: registerDto.phone,
      yearsOfExperience: registerDto.yearsOfExperience,
      qualifications: registerDto.qualifications,
      address: registerDto.address,
      city: registerDto.city,
      state: registerDto.state,
      zipCode: registerDto.zipCode,
      emergencyContact: registerDto.emergencyContact,
      additionalNotes: registerDto.additionalNotes,
      role: token.role, // Will be overridden by createUserWithToken
    };

    let school: School | undefined;
    let userId: string;

    // Handle SCHOOL_OWNER registration - create school first
    if (token.role === Role.SCHOOL_OWNER) {
      if (!registerDto.schoolName || !registerDto.schoolCity || !registerDto.schoolDistrict || 
          !registerDto.schoolPhoneNumber || !registerDto.schoolEmail || !registerDto.schoolWebsite) {
        throw new BadRequestException('School information is required for School Owner registration');
      }

      // Create user first (without school)
      const user = await this.usersService.createUserWithToken(
        userData as any,
        token.role,
        null,
      );
      userId = (user as any)._id.toString();

      // Create school
      const createSchoolDto: CreateSchoolDto = {
        name: registerDto.schoolName,
        schoolType: registerDto.schoolType,
        establishedYear: registerDto.establishedYear,
        studentCapacity: registerDto.studentCapacity || 0,
        description: registerDto.schoolDescription,
        address: registerDto.schoolAddress,
        city: registerDto.schoolCity,
        district: registerDto.schoolDistrict,
        phoneNumber: registerDto.schoolPhoneNumber,
        email: registerDto.schoolEmail,
        website: registerDto.schoolWebsite,
      };

      school = await this.schoolService.create(createSchoolDto, userId);
    } else {
      // For TEACHER and HEADTEACHER, use schoolId from token
      if (!token.schoolId) {
        throw new BadRequestException('School ID is missing from token');
      }

      const user = await this.usersService.createUserWithToken(
        userData as any,
        token.role,
        token.schoolId.toString(),
      );
      userId = (user as any)._id.toString();
    }

    // Mark token as used
    await this.registrationTokensService.markTokenAsUsed(
      token._id.toString(),
      userId,
      ipAddress,
    );

    // Get final user data
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found after registration');
    }

    return {
      message: 'Registration successful',
      user: {
        id: (user as any)._id,
        email: user.email,
        name: user.name,
        role: user.role,
        school: school ? {
          id: school._id,
          name: school.name,
        } : undefined,
      },
    };
  }
}
