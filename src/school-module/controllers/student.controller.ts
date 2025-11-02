import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { StudentService } from '../services/student.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { EnrollmentService } from '../services/enrollment.service';
import { EnrollStudentDto } from '../dto/enroll-student.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/schemas/user.schema';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CsvImportService } from '../services/csv-import.service';

@ApiTags('Students')
@Controller('students')
export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly enrollmentService: EnrollmentService,
    private readonly csvImportService: CsvImportService,
  ) {}

  @Post()
  async create(@Body() dto: CreateStudentDto) {
    return this.studentService.registerStudent(dto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.studentService.getStudentById(id);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll a student in a class' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  async enroll(
    @Param('id') id: string,
    @Body() dto: EnrollStudentDto,
    @Req() req: any,
  ) {
    return this.enrollmentService.enrollStudent(
      id,
      dto.classId,
      dto.academicYear,
      dto.entryDate ? new Date(dto.entryDate) : undefined,
    );
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import students via CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN, Role.STAFF)
  async importCsv(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new Error('No file uploaded');
    const res = await this.csvImportService.importStudentsCsv(file.buffer);
    return { results: res };
  }
}
