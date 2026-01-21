import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';
import { PartnerTypesController } from './partner-types.controller';
import { PartnerTypesService } from './partner-types.service';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [PrismaModule, FirebaseAuthModule],
  controllers: [PartnersController, PartnerTypesController],
  providers: [PartnersService, PartnerTypesService],
  exports: [PartnersService, PartnerTypesService],
})
export class PartnersModule {}
