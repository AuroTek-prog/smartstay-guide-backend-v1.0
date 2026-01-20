import { Module } from '@nestjs/common';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { PrismaModule } from '../../common/prisma.module';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

@Module({
  imports: [PrismaModule, FirebaseAuthModule],
  controllers: [GuidesController],
  providers: [GuidesService],
  exports: [GuidesService],
})
export class GuidesModule {}
