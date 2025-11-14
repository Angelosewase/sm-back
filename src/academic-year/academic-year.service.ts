// src/academic-year/academic-year.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AcademicYear,
  AcademicYearDocument,
} from 'src/academic-year/schemas/academic-year.schema';
import { Term, TermDocument } from 'src/terms/schemas/term.schema';

@Injectable()
export class AcademicYearService {
  constructor(
    @InjectModel(AcademicYear.name)
    private model: Model<AcademicYearDocument>,
    @InjectModel(Term.name)
    private termModel: Model<TermDocument>,
  ) {}

  // Create new academic year
  async create(data: { label: string; startDate?: Date; endDate?: Date }) {
    // Check if label already exists
    const exists = await this.model.findOne({ label: data.label });
    if (exists) {
      throw new BadRequestException(`Academic year with label "${data.label}" already exists`);
    }

    const academicYear = await this.model.create({
      label: data.label,
      startDate: data.startDate,
      endDate: data.endDate,
      isOpen: false,
    });

    // Create 3 terms for this academic year
    await this.termModel.create([
      { academicYear: academicYear._id, order: 1, name: 'Term 1', isOpen: false, isClosed: false },
      { academicYear: academicYear._id, order: 2, name: 'Term 2', isOpen: false, isClosed: false },
      { academicYear: academicYear._id, order: 3, name: 'Term 3', isOpen: false, isClosed: false },
    ]);

    return academicYear;
  }

  // Open an academic year (closes any currently open year)
  async open(id: string) {
    const academicYear = await this.model.findById(id);
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (academicYear.isOpen) {
      throw new BadRequestException('Academic year is already open');
    }

    // Close any currently open academic year
    await this.model.updateMany({ isOpen: true }, { isOpen: false });

    // Open this academic year
    academicYear.isOpen = true;
    return academicYear.save();
  }

  // Close an academic year
  async close(id: string) {
    const academicYear = await this.model.findById(id);
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    if (!academicYear.isOpen) {
      throw new BadRequestException('Academic year is not open');
    }

    // Check if any term is currently open
    const openTerm = await this.termModel.findOne({
      academicYear: academicYear._id,
      isOpen: true,
    });

    if (openTerm) {
      throw new BadRequestException('Cannot close academic year while a term is open');
    }

    academicYear.isOpen = false;
    return academicYear.save();
  }

  // Get all
  async findAll() {
    return this.model.find().sort({ label: -1 }).exec();
  }

  // Get open academic year
  async getOpen() {
    return this.model.findOne({ isOpen: true });
  }

  // Get by ID
  async findById(id: string) {
    const academicYear = await this.model.findById(id);
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }
    return academicYear;
  }
}
