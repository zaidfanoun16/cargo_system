import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { UsersService } from './users.service';
import {
  EmailRateLimit,
  StrictRateLimit,
} from '../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ConfirmEmailChangeDto } from './dto/confirm-email-change.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // Protected routes: require a valid JWT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() request: Request) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.usersService.findOne(currentUser.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }


  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: Request,
  ) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.usersService.update(
      currentUser.userId,
      updateUserDto,
      currentUser,
    );
  }

  @UseGuards(JwtAuthGuard)
  @StrictRateLimit()
  @Patch('profile/password')
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() request: Request,
  ) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.usersService.changePassword(
      currentUser.userId,
      changePasswordDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @EmailRateLimit()
  @Patch('profile/email')
  requestEmailChange(
    @Body() changeEmailDto: ChangeEmailDto,
    @Req() request: Request,
  ) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.usersService.requestEmailChange(
      currentUser.userId,
      changeEmailDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @StrictRateLimit()
  @Post('profile/email/confirm')
  confirmEmailChange(
    @Body() confirmEmailChangeDto: ConfirmEmailChangeDto,
    @Req() request: Request,
  ) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.usersService.confirmEmailChange(
      currentUser.userId,
      confirmEmailChangeDto.code,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() request: Request,
  ) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.usersService.update(
      id,
      updateUserDto,
      currentUser,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    const currentUser = request.user as {
      userId: number;
      email: string;
      role: string;
    };

    return this.usersService.remove(id, currentUser);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(
      id,
      updateUserRoleDto,
    );
  }
}