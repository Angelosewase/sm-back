import { Controller, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { MarksService } from '../services/marks.service';
import { EnterMarkDto } from '../dto/enter-mark.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../users/schemas/user.schema';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BulkMarksDto } from '../dto/bulk-marks.dto';

@ApiTags('Marks')
@Controller('marks')
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

  @ApiOperation({
    summary: 'Submit marks (teacher) — move drafts to submitted',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('submit')
  async submit(
    @Req() req: any,
    @Body()
    body: {
      classId: string;
      subjectId: string;
      academicYear: string;
      term?: string;
    },
  ) {
    return this.marksService.submitMarks(
      req.user,
      body.classId,
      body.subjectId,
      body.academicYear,
      body.term,
    );
  }

  @ApiOperation({ summary: 'Approve marks (admin) — lock submitted marks' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('approve')
  async approve(
    @Req() req: any,
    @Body()
    body: {
      classId: string;
      subjectId: string;
      academicYear: string;
      term?: string;
    },
  ) {
    return this.marksService.approveMarks(
      req.user,
      body.classId,
      body.subjectId,
      body.academicYear,
      body.term,
    );
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
}
