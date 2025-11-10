// src/academic-year/academic-year.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AcademicYear,
  AcademicYearDocument,
} from 'src/academic-year/schemas/academic-year.schema';

@Injectable()
export class AcademicYearService {
  constructor(
    @InjectModel(AcademicYear.name)
    private model: Model<AcademicYearDocument>,
  ) {}

  // Seed default years
  async seed() {
    const defaultYears = [
      { label: '2023/2024', isActive: false },
      { label: '2024/2025', isActive: true },
      { label: '2025/2026', isActive: false },
    ];

    for (const year of defaultYears) {
      const exists = await this.model.exists({ label: year.label });
      if (!exists) {
        await this.model.create(year);
      }
    }
  }

  // Get all
  async findAll() {
    return this.model.find().sort({ label: -1 }).exec();
  }

  // Get active one
  async getActive() {
    return this.model.findOne({ isActive: true });
  }
}
