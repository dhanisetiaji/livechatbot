import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { CreateUserDto, UpdateUserDto, AssignBotDto } from './dto/user-management.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/auth-user.entity';

@Controller('api/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.userManagementService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.userManagementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userManagementService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userManagementService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.userManagementService.remove(id);
  }

  @Post(':userId/bots')
  @Roles(UserRole.SUPER_ADMIN)
  assignBots(@Param('userId') userId: string, @Body() body: { botIds: string[], telegramNotificationId?: string }) {
    return this.userManagementService.assignBots(userId, body.botIds, body.telegramNotificationId);
  }

  @Put(':userId/bots/:botId/telegram-id')
  @Roles(UserRole.SUPER_ADMIN)
  updateTelegramNotificationId(
    @Param('userId') userId: string,
    @Param('botId') botId: string,
    @Body() body: { telegramNotificationId: string }
  ) {
    return this.userManagementService.updateTelegramNotificationId(userId, botId, body.telegramNotificationId);
  }

  @Post('assign-bot')
  @Roles(UserRole.SUPER_ADMIN)
  assignBot(@Body() assignBotDto: AssignBotDto) {
    return this.userManagementService.assignBot(assignBotDto);
  }

  @Delete(':userId/bots/:botId')
  @Roles(UserRole.SUPER_ADMIN)
  unassignBot(@Param('userId') userId: string, @Param('botId') botId: string) {
    return this.userManagementService.unassignBot(userId, botId);
  }

  @Get(':userId/bots')
  getUserBots(@Param('userId') userId: string) {
    return this.userManagementService.getUserBots(userId);
  }
}
