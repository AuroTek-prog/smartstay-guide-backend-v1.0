import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RequireAuth } from '../firebase-auth/decorators/require-auth.decorator';
import { CurrentUser } from '../firebase-auth/decorators/current-user.decorator';
import { FirebaseUser } from '../firebase-auth/interfaces/firebase-user.interface';
import { SubscribeNotificationsDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@RequireAuth()
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Registrar token de notificaciones' })
  @ApiBody({ type: SubscribeNotificationsDto })
  @ApiResponse({
    status: 201,
    description: 'Token registrado',
    schema: {
      example: {
        id: '11111111-1111-1111-1111-111111111111',
        userId: '22222222-2222-2222-2222-222222222222',
        token: 'fcm-token-or-webpush-token',
        platform: 'web',
        createdAt: '2026-01-20T10:00:00.000Z',
        updatedAt: '2026-01-20T10:00:00.000Z',
      },
    },
  })
  async subscribe(
    @Body() payload: SubscribeNotificationsDto,
    @CurrentUser() user: FirebaseUser,
  ) {
    return this.notificationsService.subscribe(user, payload);
  }
}
