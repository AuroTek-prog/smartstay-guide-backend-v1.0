import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { PrismaModule } from '../../common/prisma.module';
import { IoTModule } from '../iot/iot.module';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

@Module({
  imports: [PrismaModule, IoTModule, FirebaseAuthModule],
  controllers: [PublicApiController],
  providers: [PublicApiService],
})
export class PublicApiModule {}
