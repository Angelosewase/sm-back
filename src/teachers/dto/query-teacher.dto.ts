import { OmitType } from '@nestjs/mapped-types';
import { QueryUserDto } from '../../users/dto/query-user.dto';

export class QueryTeacherDto extends OmitType(QueryUserDto, ['role'] as const) {}


