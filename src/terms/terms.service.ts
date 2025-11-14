// src/term/term.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Term, TermDocument } from 'src/terms/schemas/term.schema';
import { AcademicYear, AcademicYearDocument } from 'src/academic-year/schemas/academic-year.schema';

@Injectable()
export class TermService {
  constructor(
    @InjectModel(Term.name) private model: Model<TermDocument>,
    @InjectModel(AcademicYear.name) private academicYearModel: Model<AcademicYearDocument>,
  ) {}

  // Get all terms for an academic year
  async findByAcademicYear(academicYearId: string) {
    return this.model
      .find({ academicYear: academicYearId })
      .sort({ order: 1 })
      .exec();
  }

  // Get open term for an academic year
  async getOpenTerm(academicYearId: string) {
    return this.model.findOne({
      academicYear: academicYearId,
      isOpen: true,
    });
  }

  // Open a term
  async openTerm(academicYearId: string, termOrder: number) {
    // Check if academic year is open
    const academicYear = await this.academicYearModel.findById(academicYearId);
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (!academicYear.isOpen) {
      throw new BadRequestException('Cannot open term when academic year is not open');
    }

    // Get the term
    const term = await this.model.findOne({
      academicYear: academicYearId,
      order: termOrder,
    });

    if (!term) {
      throw new NotFoundException(`Term ${termOrder} not found for this academic year`);
    }

    // Check if term was already closed (cannot reopen)
    if (term.isClosed) {
      throw new BadRequestException(`Term ${termOrder} has been closed and cannot be reopened`);
    }

    // Check if term is already open
    if (term.isOpen) {
      throw new BadRequestException(`Term ${termOrder} is already open`);
    }

    // Validate sequential opening: can only open if previous terms have been opened and closed
    if (termOrder > 1) {
      for (let i = 1; i < termOrder; i++) {
        const previousTerm = await this.model.findOne({
          academicYear: academicYearId,
          order: i,
        });

        if (!previousTerm || !previousTerm.isClosed) {
          throw new BadRequestException(
            `Cannot open Term ${termOrder}. Term ${i} must be opened and closed first`,
          );
        }
      }
    }

    // Close any currently open term in this academic year
    await this.model.updateMany(
      { academicYear: academicYearId, isOpen: true },
      { isOpen: false },
    );

    // Open the requested term
    term.isOpen = true;
    term.startDate = new Date();
    return term.save();
  }

  // Close a term
  async closeTerm(academicYearId: string, termOrder: number) {
    // Check if academic year is open
    const academicYear = await this.academicYearModel.findById(academicYearId);
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (!academicYear.isOpen) {
      throw new BadRequestException('Cannot close term when academic year is not open');
    }

    // Get the term
    const term = await this.model.findOne({
      academicYear: academicYearId,
      order: termOrder,
    });

    if (!term) {
      throw new NotFoundException(`Term ${termOrder} not found for this academic year`);
    }

    if (!term.isOpen) {
      throw new BadRequestException(`Term ${termOrder} is not open`);
    }

    // Close the term
    term.isOpen = false;
    term.isClosed = true;
    term.endDate = new Date();
    return term.save();
  }

  // Get term by ID
  async findById(id: string) {
    const term = await this.model.findById(id);
    if (!term) {
      throw new NotFoundException('Term not found');
    }
    return term;
  }
}
