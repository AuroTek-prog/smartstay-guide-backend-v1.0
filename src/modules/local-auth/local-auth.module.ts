import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma.module';
import { LocalAuthController } from './local-auth.controller';
import { LocalAuthService } from './local-auth.service';

@Module({
  imports: [PrismaModule],
  controllers: [LocalAuthController],
  providers: [LocalAuthService],
})
export class LocalAuthModule {}
