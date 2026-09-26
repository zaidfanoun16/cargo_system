import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

// The signed-in user's own notifications
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() request: Request) {
    return this.notificationsService.list(this.userId(request));
  }

  // Declared before ':id/read'
  @Patch('read-all')
  markAllRead(@Req() request: Request) {
    return this.notificationsService.markAllRead(this.userId(request));
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.notificationsService.markRead(id, this.userId(request));
  }

  private userId(request: Request) {
    return (request.user as { userId: number }).userId;
  }
}
