import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BotService } from './bot.service';
import { CreateBotDto, UpdateBotDto } from './dto/bot.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../entities/auth-user.entity';

@Controller('api/bots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() createBotDto: CreateBotDto) {
    return this.botService.create(createBotDto);
  }

  @Get()
  findAll() {
    return this.botService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.botService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateBotDto: UpdateBotDto) {
    return this.botService.update(id, updateBotDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.botService.remove(id);
  }

  @Post(':id/toggle')
  @Roles(UserRole.SUPER_ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.botService.toggleActive(id);
  }
}
