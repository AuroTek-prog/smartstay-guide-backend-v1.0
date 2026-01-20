import { Module } from '@nestjs/common';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { PrismaModule } from '../../common/prisma.module';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

@Module({
  imports: [PrismaModule, FirebaseAuthModule],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService],
})
export class SurveysModule {}
