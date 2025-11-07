import { OmitType } from '@nestjs/mapped-types';
import { QueryUserDto } from '../../users/dto/query-user.dto';

export class QueryStaffDto extends OmitType(QueryUserDto, ['role'] as const) {}


