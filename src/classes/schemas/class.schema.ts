import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, model, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Teacher } from 'src/teachers/schemas/teacher.schema';

export enum ClassStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export type ClassDocument = Class & Document;

@Schema({ timestamps: true })
export class Class extends Document {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  gradeLevel: string;

  @Prop({ required: true, min: 0 })
  capacity: number;

  @Prop({ required: true, min: 0, default: 0 })
  studentCount: number;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    required: true,
    enum: ClassStatus,
    default: ClassStatus.ACTIVE,
  })
  status: ClassStatus;

  @Prop({
    type: Types.ObjectId,
    ref: Teacher.name,
    default: null,
  })
  classTeacher?: Types.ObjectId | null;

  @Prop({ default: false })
  isTrashed: boolean;

  @Prop({ type: Date, default: null })
  trashedAt?: Date | null;

  @Prop({ type: [Types.ObjectId], ref: 'Subject', default: [] })
  assignedSubjects?: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Student', default: [] })
  students?: Types.ObjectId[];
}

export const ClassSchema = SchemaFactory.createForClass(Class);

// Virtual populate for students - alternative to array storage
ClassSchema.virtual('studentList', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'class',
  justOne: false,
});

// Instance method to populate students
ClassSchema.methods.getStudents = async function () {
  return await this.model('Student')
    .find({ class: this._id, isTrashed: false })
    .select('studentId name email phoneNumber gradeLevel status')
    .sort({ name: 1 })
    .exec();
};

// Instance method to get active students only
ClassSchema.methods.getActiveStudents = async function () {
  return await this.model('Student')
    .find({
      class: this._id,
      status: 'active',
      isTrashed: false,
    })
    .select('studentId name email phoneNumber gradeLevel')
    .sort({ name: 1 })
    .exec();
};

// Instance method to get students with full details
ClassSchema.methods.getStudentsWithDetails = async function () {
  return await this.model('Student')
    .find({ class: this._id, isTrashed: false })
    .sort({ name: 1 })
    .exec();
};

// static methods

ClassSchema.statics.findStudentsByClassId = async function (
  classId: Types.ObjectId,
) {
  return await model('Student')
    .find({ class: new Types.ObjectId(classId), isTrashed: false })
    .select('studentId name email phoneNumber gradeLevel status')
    .sort({ name: 1 })
    .exec();
};
ClassSchema.index({ name: 1, gradeLevel: 1 }, { unique: true });

// Ensure virtuals are included in JSON output
ClassSchema.set('toJSON', { virtuals: true });
ClassSchema.set('toObject', { virtuals: true });
