// src/term/term.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Term, TermDocument } from 'src/terms/schemas/term.schema';

@Injectable()
export class TermService {
  constructor(@InjectModel(Term.name) private model: Model<TermDocument>) {}

  // Seed default terms
  async seed() {
    const defaultTerms = [
      { name: 'Term 1', order: 1 },
      { name: 'Term 2', order: 2 },
      { name: 'Term 3', order: 3 },
    ];

    for (const term of defaultTerms) {
      const exists = await this.model.exists({ name: term.name });
      if (!exists) {
        await this.model.create(term);
      }
    }
  }

  // Get all
  async findAll() {
    return this.model.find().sort({ order: 1 }).exec();
  }
}
