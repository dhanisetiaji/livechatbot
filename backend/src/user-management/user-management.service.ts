import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser, UserRole } from '../entities/auth-user.entity';
import { Bot } from '../entities/bot.entity';
import { BotUser } from '../entities/bot-user.entity';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto, UpdateUserDto, AssignBotDto } from './dto/user-management.dto';

@Injectable()
export class UserManagementService {
  constructor(
    @InjectRepository(AuthUser)
    private authUserRepository: Repository<AuthUser>,
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    @InjectRepository(BotUser)
    private botUserRepository: Repository<BotUser>,
    private authService: AuthService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<AuthUser> {
    // Check if username exists
    const existing = await this.authUserRepository.findOne({
      where: { username: createUserDto.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await this.authService.hashPassword(createUserDto.password);

    const user = this.authUserRepository.create({
      username: createUserDto.username,
      password: hashedPassword,
      role: createUserDto.role || UserRole.ADMIN,
    });

    return this.authUserRepository.save(user);
  }

  async findAll(): Promise<AuthUser[]> {
    return this.authUserRepository.find({
      relations: ['botUsers', 'botUsers.bot'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<AuthUser> {
    const user = await this.authUserRepository.findOne({
      where: { id },
      relations: ['botUsers', 'botUsers.bot'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<AuthUser> {
    const user = await this.findOne(id);

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existing = await this.authUserRepository.findOne({
        where: { username: updateUserDto.username },
      });

      if (existing) {
        throw new ConflictException('Username already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await this.authService.hashPassword(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    return this.authUserRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.authUserRepository.remove(user);
  }

  async assignBot(assignBotDto: AssignBotDto): Promise<BotUser> {
    // Validate user exists
    const user = await this.authUserRepository.findOne({
      where: { id: assignBotDto.userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${assignBotDto.userId} not found`);
    }

    // Validate bot exists
    const bot = await this.botRepository.findOne({
      where: { id: assignBotDto.botId },
    });

    if (!bot) {
      throw new NotFoundException(`Bot with ID ${assignBotDto.botId} not found`);
    }

    // Check if already assigned
    const existing = await this.botUserRepository.findOne({
      where: {
        authUserId: assignBotDto.userId,
        botId: assignBotDto.botId,
      },
    });

    if (existing) {
      throw new ConflictException('User already assigned to this bot');
    }

    const botUser = this.botUserRepository.create({
      authUserId: assignBotDto.userId,
      botId: assignBotDto.botId,
      telegramNotificationId: assignBotDto.telegramNotificationId,
    });

    return this.botUserRepository.save(botUser);
  }

  async unassignBot(userId: string, botId: string): Promise<void> {
    const botUser = await this.botUserRepository.findOne({
      where: { authUserId: userId, botId: botId },
    });

    if (!botUser) {
      throw new NotFoundException('Assignment not found');
    }

    await this.botUserRepository.remove(botUser);
  }

  async getUserBots(userId: string): Promise<BotUser[]> {
    return this.botUserRepository.find({
      where: { authUserId: userId },
      relations: ['bot'],
    });
  }

  async assignBots(userId: string, botIds: string[], telegramNotificationId?: string): Promise<void> {
    // Verify user exists
    const user = await this.authUserRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verify all bots exist
    for (const botId of botIds) {
      const bot = await this.botRepository.findOne({
        where: { id: botId },
      });

      if (!bot) {
        throw new NotFoundException(`Bot with ID ${botId} not found`);
      }

      // Check if already assigned
      const existing = await this.botUserRepository.findOne({
        where: {
          authUserId: userId,
          botId: botId,
        },
      });

      if (existing) {
        // Update telegramNotificationId if provided
        if (telegramNotificationId !== undefined) {
          existing.telegramNotificationId = telegramNotificationId;
          await this.botUserRepository.save(existing);
        }
      } else {
        // Create new assignment
        const botUser = this.botUserRepository.create({
          authUserId: userId,
          botId: botId,
          telegramNotificationId: telegramNotificationId || null,
        });

        await this.botUserRepository.save(botUser);
      }
    }
  }

  async updateTelegramNotificationId(userId: string, botId: string, telegramNotificationId: string): Promise<BotUser> {
    const botUser = await this.botUserRepository.findOne({
      where: { authUserId: userId, botId: botId },
    });

    if (!botUser) {
      throw new NotFoundException('Bot assignment not found');
    }

    botUser.telegramNotificationId = telegramNotificationId;
    return this.botUserRepository.save(botUser);
  }
}
