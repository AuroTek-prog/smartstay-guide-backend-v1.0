import { Module } from '@nestjs/common';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';

@Module({
  imports: [FirebaseAuthModule],
  controllers: [UnitsController],
  providers: [UnitsService],
})
export class UnitsModule {}
