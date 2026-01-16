import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Get,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/users/schemas/user.schema';
import { BulkMarksDto } from './dto/bulk-marks.dto';
import { EnterMarkDto } from './dto/enter-mark.dto';
import { MarksService } from './marks.service';
@ApiBearerAuth('access-token')
@ApiTags('Marks')
@Controller('api/marks')
export class MarksController {
  constructor(private readonly marksService: MarksService) {}

  @ApiOperation({ summary: 'Enter a single mark' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Post()
  async enter(@Req() req: any, @Body() dto: EnterMarkDto) {
    const user = req.user;
    return this.marksService.enterMark(user, dto);
  }

  @ApiOperation({ summary: 'Bulk enter marks' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('bulk')
  async bulkEnter(@Req() req: any, @Body() dto: BulkMarksDto) {
    const user = req.user;
    const results = [] as any[];
    for (const m of dto.marks) {
      try {
        const res = await this.marksService.enterMark(user, m as any);
        results.push({ ok: true, id: res._id });
      } catch (e: any) {
        results.push({ ok: false, error: e?.message || String(e), mark: m });
      }
    }
    return { results };
  }

  @ApiOperation({ summary: 'Update a mark (teacher/admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('update/:id')
  async updateMark(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { score?: number; comment?: string },
  ) {
    return this.marksService.updateMark(req.user, id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Get()
  async list() {
    return this.marksService.getAllMarksRecords();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Get('assessments/:assessmentId')
  async getAssessmentMarks(@Param('assessmentId') assessmentId: string) {
    return this.marksService.getAssessmentMarks(assessmentId);
  }

  @ApiOperation({ summary: 'Delete a mark (teacher/admin)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Delete(':id')
  async deleteMark(@Req() req: any, @Param('id') id: string) {
    return this.marksService.deleteMark(req.user, id);
  }
}
