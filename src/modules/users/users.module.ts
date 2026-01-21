import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { FirebaseAuthModule } from '../firebase-auth/firebase-auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, FirebaseAuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
