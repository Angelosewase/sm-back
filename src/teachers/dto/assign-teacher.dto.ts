import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId } from "class-validator";

export class AssignTeacherDto {
    @ApiProperty({ description: 'Teacher _id to assign to the class', example: '68f79d534286e66c8b4ad219' })
    @IsMongoId()
    teacherId: string;
}