import { Controller, Get, UseGuards } from '@nestjs/common';

import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // GET /admin/stats - Admin only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  getStats() {
    return this.statsService.getStats();
  }
}
