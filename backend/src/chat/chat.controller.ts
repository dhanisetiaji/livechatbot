import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('users')
  async getUsers(@Request() req, @Query('botId') botId?: string) {
    return this.chatService.getAllUsers(req.user.userId, req.user.role, botId);
  }

  @Post('users/:userId/read')
  async markUserMessagesAsRead(@Request() req, @Param('userId') userId: string) {
    return this.chatService.markUserMessagesAsRead(req.user.userId, req.user.role, userId);
  }

  @Get('users/:userId/messages')
  async getUserMessages(
    @Request() req,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    const offsetNumber = offset ? parseInt(offset, 10) : 0;
    return this.chatService.getUserMessages(req.user.userId, req.user.role, userId, limitNumber, offsetNumber, search);
  }

  @Post('users/:userId/messages')
  async sendMessage(
    @Request() req,
    @Param('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(req.user.userId, req.user.role, userId, dto.content, dto.photoUrl);
  }

  @Get('stats')
  async getStats(@Request() req, @Query('botId') botId?: string) {
    return this.chatService.getStats(req.user.userId, req.user.role, botId);
  }

  @Post('messages/:messageId/read')
  async markAsRead(@Request() req, @Param('messageId') messageId: string) {
    return this.chatService.markAsRead(req.user.userId, req.user.role, messageId);
  }
}
