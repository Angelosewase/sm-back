import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { Class, ClassSchema } from './schemas/class.schema';
import { Teacher, TeacherSchema } from '../teachers/schemas/teacher.schema';
import { UsersModule } from '../users/users.module';
import { SubjectsModule } from 'src/subjects/subjects.module';
import { TeachersModule } from 'src/teachers/teachers.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Class.name, schema: ClassSchema },
      { name: Teacher.name, schema: TeacherSchema },

    ]),
    UsersModule,
    TeachersModule,
    forwardRef(()=> SubjectsModule),
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
