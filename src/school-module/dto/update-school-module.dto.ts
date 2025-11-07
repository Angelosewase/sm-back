import { PartialType } from '@nestjs/swagger';
import { CreateSchoolModuleDto } from './create-school-module.dto';

export class UpdateSchoolModuleDto extends PartialType(CreateSchoolModuleDto) {}
