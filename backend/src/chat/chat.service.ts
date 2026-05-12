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

  private async verifyBotAccess(
    authUserId: string,
    userRole: UserRole,
    botId: string,
  ): Promise<void> {
    if (userRole === UserRole.SUPER_ADMIN) return;
    const botUser = await this.botUserRepository.findOne({
      where: { authUserId, botId },
    });
    if (!botUser) {
      throw new ForbiddenException('You do not have access to this bot');
    }
  }

  private async getAccessibleBotIds(
    authUserId: string,
    userRole: UserRole,
  ): Promise<string[]> {
    if (userRole === UserRole.SUPER_ADMIN) {
      const allBots = await this.botRepository.find();
      return allBots.map((bot) => bot.id);
    }
    const botUsers = await this.botUserRepository.find({ where: { authUserId } });
    return botUsers.map((bu) => bu.botId);
  }

  /**
   * Aggregate users + last message + unread count without N+1.
   */
  async getAllUsers(authUserId: string, userRole: UserRole, botId?: string) {
    let botIds: string[];
    if (botId) {
      await this.verifyBotAccess(authUserId, userRole, botId);
      botIds = [botId];
    } else {
      botIds = await this.getAccessibleBotIds(authUserId, userRole);
    }

    if (botIds.length === 0) return [];

    const users = await this.userRepository.find({
      where: { botId: In(botIds) },
      relations: ['bot'],
      order: { updatedAt: 'DESC' },
    });

    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);

    const unreadRows = await this.messageRepository
      .createQueryBuilder('m')
      .select('m.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('m.userId IN (:...userIds)', { userIds })
      .andWhere('m.sender = :sender', { sender: MessageSender.USER })
      .andWhere('m.isRead = false')
      .groupBy('m.userId')
      .getRawMany();

    const unreadMap = new Map<string, number>(
      unreadRows.map((r) => [r.userId, parseInt(r.count, 10)]),
    );

    const lastMessages = await this.messageRepository
      .createQueryBuilder('m')
      .distinctOn(['m.userId'])
      .where('m.userId IN (:...userIds)', { userIds })
      .orderBy('m.userId')
      .addOrderBy('m.createdAt', 'DESC')
      .getMany();

    const lastMap = new Map<string, Message>(lastMessages.map((m) => [m.userId, m]));

    const mapped = users.map((user) => {
      const last = lastMap.get(user.id);
      return {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        botId: user.botId,
        botName: user.bot?.botName,
        unreadCount: unreadMap.get(user.id) ?? 0,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              sender: last.sender,
            }
          : null,
        updatedAt: user.updatedAt.toISOString(),
      };
    });

    return mapped.sort((a, b) => {
      const aT = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bT = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      if (aT !== bT) return bT - aT;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  async getUserMessages(
    authUserId: string,
    userRole: UserRole,
    userId: string,
    limit = 20,
    offset = 0,
    search?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.verifyBotAccess(authUserId, userRole, user.botId);

    const qb = this.messageRepository
      .createQueryBuilder('message')
      .where('message.userId = :userId', { userId })
      .andWhere('message.botId = :botId', { botId: user.botId });

    if (search) {
      qb.andWhere('message.content ILIKE :search', { search: `%${search}%` });
    }

    const total = await qb.getCount();

    const messages = await qb
      .orderBy('message.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const reversed = messages.reverse();

    return {
      messages: reversed.map((m) => ({
        id: m.id,
        content: m.content,
        sender: m.sender,
        isRead: m.isRead,
        createdAt: m.createdAt.toISOString(),
        photoUrl: m.photoUrl,
        userId: m.userId,
        botId: m.botId,
      })),
      total,
      hasMore: offset + limit < total,
    };
  }

  async sendMessage(
    authUserId: string,
    userRole: UserRole,
    userId: string,
    content: string,
    photoUrl?: string,
    clientMessageId?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.verifyBotAccess(authUserId, userRole, user.botId);

    const message = await this.multiBotService.sendMessageToUser(
      user.botId,
      user.telegramId,
      content,
      photoUrl,
    );

    if (!message) throw new Error('Failed to send message');

    return {
      id: message.id,
      clientMessageId,
      content: message.content,
      sender: message.sender,
      isRead: message.isRead,
      createdAt: message.createdAt.toISOString(),
      userId: message.userId,
      botId: user.botId,
      photoUrl: message.photoUrl,
    };
  }

  async getStats(authUserId: string, userRole: UserRole, botId?: string) {
    if (botId) {
      await this.verifyBotAccess(authUserId, userRole, botId);
      const totalUsers = await this.userRepository.count({ where: { botId } });
      const totalMessages = await this.messageRepository.count({ where: { botId } });
      const unreadMessages = await this.messageRepository.count({
        where: { botId, sender: MessageSender.USER, isRead: false },
      });
      return { totalUsers, totalMessages, unreadMessages, botId };
    }

    const accessibleBotIds = await this.getAccessibleBotIds(authUserId, userRole);
    if (accessibleBotIds.length === 0) {
      return { totalUsers: 0, totalMessages: 0, unreadMessages: 0 };
    }

    const where = { botId: In(accessibleBotIds) } as const;
    const totalUsers = await this.userRepository.count({ where });
    const totalMessages = await this.messageRepository.count({ where });
    const unreadMessages = await this.messageRepository.count({
      where: { ...where, sender: MessageSender.USER, isRead: false },
    });
    return { totalUsers, totalMessages, unreadMessages };
  }

  async markUserMessagesAsRead(
    authUserId: string,
    userRole: UserRole,
    userId: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.verifyBotAccess(authUserId, userRole, user.botId);

    await this.messageRepository.update(
      {
        userId,
        botId: user.botId,
        sender: MessageSender.USER,
        isRead: false,
      },
      { isRead: true },
    );

    // Sync other admin tabs viewing the same bot
    this.eventsGateway.notifyUserRead(user.botId, userId);

    return { success: true };
  }

  async markAsRead(authUserId: string, userRole: UserRole, messageId: string) {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException('Message not found');

    await this.verifyBotAccess(authUserId, userRole, message.botId);

    await this.messageRepository.update(messageId, { isRead: true });
    return { success: true };
  }
}
