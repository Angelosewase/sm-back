import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Assessment, AssessmentSchema } from "./schemas/assessment-schema";
import { Subject, SubjectSchema } from "src/subjects/schemas/subject.schema";
import { Class, ClassSchema } from "src/classes/schemas/class.schema";
import { AssessmentController } from "./assessment.controller";
import { AssessmentService } from "./assessment.service";
import { Marks, MarksSchema } from "src/marks/schemas/marks.schema";
import { Term, TermSchema } from "src/terms/schemas/term.schema";
import { AcademicYear, AcademicYearSchema } from "src/academic-year/schemas/academic-year.schema";

@Module({
imports: [
    MongooseModule.forFeature([
        {name: Assessment.name, schema: AssessmentSchema},
        {name: Subject.name, schema: SubjectSchema},
        {name: Class.name, schema: ClassSchema},
        {name: Marks.name, schema: MarksSchema},
        {name: AcademicYear.name, schema: AcademicYearSchema},
        {name: Term.name, schema: TermSchema},
    ]),
],
controllers: [AssessmentController],
providers: [AssessmentService],
exports: [AssessmentService],
})
export class AssessmentModule {}