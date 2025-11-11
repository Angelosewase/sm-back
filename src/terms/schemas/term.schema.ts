import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TermDocument = Term & Document;

@Schema({ timestamps: true })
export class Term {
  @Prop({ required: true, trim: true })
  name: string; // Term 1, Term 2, etc

  @Prop({ type: Number, default: 0 })
  order?: number;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;
}

export const TermSchema = SchemaFactory.createForClass(Term);
