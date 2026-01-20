import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

@Module({
  imports: [FirebaseAuthModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
