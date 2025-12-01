import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RegistrationTokensService } from './registration-tokens.service';
import { RegistrationRequestsService } from './registration-requests.service';
import { RegistrationTokensController } from './registration-tokens.controller';
import {
  RegistrationToken,
  RegistrationTokenSchema,
} from './schemas/registration-token.schema';
import {
  RegistrationRequest,
  RegistrationRequestSchema,
} from './schemas/registration-request.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { School, SchoolSchema } from '../school/entities/school.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegistrationToken.name, schema: RegistrationTokenSchema },
      { name: RegistrationRequest.name, schema: RegistrationRequestSchema },
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
    ]),
  ],
  controllers: [RegistrationTokensController],
  providers: [RegistrationTokensService, RegistrationRequestsService],
  exports: [RegistrationTokensService, RegistrationRequestsService],
})
export class RegistrationTokensModule {}

