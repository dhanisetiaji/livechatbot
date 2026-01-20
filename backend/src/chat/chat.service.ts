import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { Message, MessageSender } from '../entities/message.entity';
import { Bot } from '../entities/bot.entity';
import { BotUser } from '../entities/bot-user.entity';
import { MultiBotService } from '../telegram/multi-bot.service';
import { EventsGateway } from '../events/events.gateway';
import { UserRole } from '../entities/auth-user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    @InjectRepository(BotUser)
    private botUserRepository: Repository<BotUser>,
    private multiBotService: MultiBotService,
    private eventsGateway: EventsGateway,
  ) {}

  // Helper to convert UTC to WIB ISO string
  private toWIB(date: Date): string {
    const utcTime = date.getTime();
    // Add 14 hours (7 hours x 2) because database seems to be storing in UTC-7
    // Real time WIB = database time + 14 hours
    const wibTime = new Date(utcTime + (14 * 60 * 60 * 1000));
    const isoString = wibTime.toISOString();
    return isoString;
  }

  // Helper to verify user has access to bot
  private async verifyBotAccess(authUserId: string, userRole: UserRole, botId: string): Promise<void> {
    // Super admin has access to all bots
    if (userRole === UserRole.SUPER_ADMIN) {
      return;
    }

    // Regular admin must be assigned to the bot
    const botUser = await this.botUserRepository.findOne({
      where: { authUserId, botId },
    });

    if (!botUser) {
      throw new ForbiddenException('You do not have access to this bot');
    }
  }

  // Helper to get all bot IDs accessible by user
  private async getAccessibleBotIds(authUserId: string, userRole: UserRole): Promise<string[]> {
    if (userRole === UserRole.SUPER_ADMIN) {
      const allBots = await this.botRepository.find();
      return allBots.map(bot => bot.id);
    }

    const botUsers = await this.botUserRepository.find({
      where: { authUserId },
      relations: ['bot'],
    });
    
    return botUsers.map(bu => bu.botId);
  }

  async getAllUsers(authUserId: string, userRole: UserRole, botId?: string) {
    // If botId specified, verify access
    if (botId) {
      await this.verifyBotAccess(authUserId, userRole, botId);
      
      const users = await this.userRepository.find({
        where: { botId },
        relations: ['messages', 'bot'],
        order: { updatedAt: 'DESC' },
      });

      return this.mapUsersWithMessages(users);
    }

    // No botId specified - return users from all accessible bots
    const accessibleBotIds = await this.getAccessibleBotIds(authUserId, userRole);
    
    if (accessibleBotIds.length === 0) {
      return [];
    }

    const users = await this.userRepository.find({
      where: { botId: In(accessibleBotIds) },
      relations: ['messages', 'bot'],
      order: { updatedAt: 'DESC' },
    });

    return this.mapUsersWithMessages(users);
  }

  private mapUsersWithMessages(users: User[]) {
    return users.map(user => {
      const unreadCount = user.messages.filter(
        m => m.sender === MessageSender.USER && !m.isRead
      ).length;
      
      const lastMessage = user.messages.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )[0];

      return {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        botId: user.botId,
        botName: user.bot?.botName,
        unreadCount,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: this.toWIB(lastMessage.createdAt),
          sender: lastMessage.sender,
        } : null,
        updatedAt: this.toWIB(user.updatedAt),
      };
    });
  }

  async getUserMessages(authUserId: string, userRole: UserRole, userId: string, limit: number = 20, offset: number = 0, search?: string) {
    // Get user to check which bot they belong to
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['bot'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify access to this user's bot
    await this.verifyBotAccess(authUserId, userRole, user.botId);

    // Get total count
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'user')
      .where('message.userId = :userId', { userId })
      .andWhere('message.botId = :botId', { botId: user.botId });

    // Add search filter if provided
    if (search) {
      queryBuilder.andWhere('message.content ILIKE :search', { search: `%${search}%` });
    }

    const total = await queryBuilder.getCount();

    // Get paginated messages (DESC order for latest first, then reverse for chat display)
    const messages = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    // Reverse to show oldest first in chat
    const reversedMessages = messages.reverse();

    return {
      messages: reversedMessages.map(m => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        isRead: m.isRead,
        createdAt: this.toWIB(m.createdAt),
        photoUrl: m.photoUrl,
        user: {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          username: m.user.username,
        },
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  async sendMessage(authUserId: string, userRole: UserRole, userId: string, content: string, photoUrl?: string) {
    // Get user to check which bot they belong to
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['bot'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify access to this user's bot
    await this.verifyBotAccess(authUserId, userRole, user.botId);

    const message = await this.multiBotService.sendMessageToUser(
      user.botId,
      user.telegramId,
      content,
      photoUrl
    );
    
    if (!message) {
      throw new Error('Failed to send message');
    }

    // Return with WIB timestamp
    return {
      id: message.id,
      content: message.content,
      sender: message.sender,
      isRead: message.isRead,
      createdAt: this.toWIB(message.createdAt),
      userId: message.userId,
      photoUrl: message.photoUrl,
    };
  }

  async getStats(authUserId: string, userRole: UserRole, botId?: string) {
    // If botId specified, verify access and get stats for that bot
    if (botId) {
      await this.verifyBotAccess(authUserId, userRole, botId);
      
      const totalUsers = await this.userRepository.count({ where: { botId } });
      const totalMessages = await this.messageRepository.count({ where: { botId } });
      const unreadMessages = await this.messageRepository.count({
        where: { botId, sender: MessageSender.USER, isRead: false },
      });

      return {
        totalUsers,
        totalMessages,
        unreadMessages,
        botId,
      };
    }

    // No botId - aggregate stats from all accessible bots
    const accessibleBotIds = await this.getAccessibleBotIds(authUserId, userRole);
    
    if (accessibleBotIds.length === 0) {
      return {
        totalUsers: 0,
        totalMessages: 0,
        unreadMessages: 0,
      };
    }

    const totalUsers = await this.userRepository.count({ 
      where: { botId: In(accessibleBotIds) } 
    });
    const totalMessages = await this.messageRepository.count({ 
      where: { botId: In(accessibleBotIds) } 
    });
    const unreadMessages = await this.messageRepository.count({
      where: { 
        botId: In(accessibleBotIds),
        sender: MessageSender.USER, 
        isRead: false 
      },
    });

    return {
      totalUsers,
      totalMessages,
      unreadMessages,
    };
  }

  async markUserMessagesAsRead(authUserId: string, userRole: UserRole, userId: string) {
    // Get user to check which bot they belong to
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify access to this user's bot
    await this.verifyBotAccess(authUserId, userRole, user.botId);

    await this.messageRepository.update(
      { userId, botId: user.botId, sender: MessageSender.USER, isRead: false },
      { isRead: true }
    );
    return { success: true };
  }

  async markAsRead(authUserId: string, userRole: UserRole, messageId: string) {
    // Get message to check which bot it belongs to
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['user'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify access to this message's bot
    await this.verifyBotAccess(authUserId, userRole, message.botId);

    await this.messageRepository.update(messageId, { isRead: true });
    return { success: true };
  }
}
