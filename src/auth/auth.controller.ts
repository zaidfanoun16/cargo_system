import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getCurrentUser(@Req() request: Request) {
    return request.user;
  }
}