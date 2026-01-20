import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context } from 'telegraf';
import { User } from '../entities/user.entity';
import { Message, MessageSender } from '../entities/message.entity';
import { BotUser } from '../entities/bot-user.entity';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(BotUser)
    private botUserRepository: Repository<BotUser>,
    private eventsGateway: EventsGateway,
  ) {}

  setupHandlers(bot: Telegraf, botId: string) {
    // Start command
    bot.start(async (ctx) => {
      await this.handleStart(ctx, botId);
    });

    // Text messages
    bot.on('text', async (ctx) => {
      if ('text' in ctx.message) {
        await this.handleUserMessage(ctx, botId, ctx.message.text, null);
      }
    });

    // Photo messages
    bot.on('photo', async (ctx) => {
      if ('photo' in ctx.message) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const caption = 'caption' in ctx.message ? ctx.message.caption : '[Photo]';
        
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        const photoPath = await this.downloadTelegramPhoto(fileLink.href, photo.file_id, botId);
        
        await this.handleUserMessage(ctx, botId, caption || '[Photo]', photoPath);
      }
    });
  }

  private async handleStart(ctx: Context, botId: string) {
    const from = ctx.from;
    
    let user = await this.userRepository.findOne({
      where: { telegramId: from.id, botId },
    });

    if (!user) {
      user = this.userRepository.create({
        telegramId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        botId,
      });
      await this.userRepository.save(user);
    }

    await ctx.reply(
      `Selamat datang di Live Chat Support! 👋\n\n` +
      `Silakan ketik pesan Anda dan admin kami akan segera membalas.`,
    );
  }

  private async handleUserMessage(ctx: Context, botId: string, text: string, photoUrl: string | null) {
    const from = ctx.from;

    let user = await this.userRepository.findOne({
      where: { telegramId: from.id, botId },
    });

    if (!user) {
      user = this.userRepository.create({
        telegramId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
        botId,
      });
      await this.userRepository.save(user);
    }

    const message = this.messageRepository.create({
      content: text,
      sender: MessageSender.USER,
      user: user,
      userId: user.id,
      photoUrl: photoUrl,
      botId,
    });
    await this.messageRepository.save(message);

    // Get bot instance for notifications - we'll pass it from handler
    // For now, just log
    this.logger.log(`Message received from user ${user.telegramId}: ${text}`);

    // Notify dashboard via WebSocket
    this.eventsGateway.notifyNewMessage({
      id: message.id,
      content: message.content,
      sender: message.sender,
      createdAt: this.toWIB(message.createdAt),
      userId: user.id,
      photoUrl: photoUrl,
      botId: botId,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
    });
  }

  async sendMessage(bot: Telegraf, telegramId: number, content: string, photoPath?: string, botId?: string) {
    // Send to Telegram
    if (photoPath) {
      if (photoPath.startsWith('/uploads/')) {
        const { createReadStream } = require('fs');
        const { join } = require('path');
        const filePath = join(__dirname, '..', '..', photoPath);
        await bot.telegram.sendPhoto(telegramId, {
          source: createReadStream(filePath),
        }, {
          caption: content,
        });
      } else if (photoPath.startsWith('http')) {
        await bot.telegram.sendPhoto(telegramId, photoPath, {
          caption: content,
        });
      } else {
        await bot.telegram.sendMessage(telegramId, content);
      }
    } else {
      await bot.telegram.sendMessage(telegramId, content);
    }

    // Save to database if botId is provided
    if (botId) {
      const user = await this.userRepository.findOne({
        where: { telegramId: telegramId, botId },
      });

      if (user) {
        const message = this.messageRepository.create({
          userId: user.id,
          botId: botId,
          content: content,
          sender: MessageSender.ADMIN,
          photoUrl: photoPath,
          isRead: true,
        });

        const savedMessage = await this.messageRepository.save(message);
        return savedMessage;
      }
    }

    return null;
  }

  async notifyAdmins(botId: string, message: string, bot?: any) {
    try {
      this.logger.log(`🔔 Attempting to notify admins for bot ${botId}`);
      
      const botUsers = await this.botUserRepository.find({
        where: { botId },
      });

      this.logger.log(`Found ${botUsers.length} bot users for bot ${botId}`);

      if (botUsers.length === 0) {
        this.logger.warn(`No bot users found for bot ${botId}. Please assign users to this bot.`);
        return;
      }

      for (const botUser of botUsers) {
        try {
          this.logger.log(`Checking botUser: authUserId=${botUser.authUserId}, telegramNotificationId=${botUser.telegramNotificationId}`);
          
          if (!botUser.telegramNotificationId) {
            this.logger.warn(`BotUser ${botUser.id} has no telegramNotificationId set. Skipping notification.`);
            continue;
          }

          if (!bot) {
            this.logger.error(`Bot instance is undefined for bot ${botId}. Cannot send notification.`);
            continue;
          }

          // Send Telegram notification to admin
          await bot.telegram.sendMessage(
            parseInt(botUser.telegramNotificationId),
            message
          );
          this.logger.log(`✅ Notification sent successfully to admin Telegram ID: ${botUser.telegramNotificationId}`);
        } catch (error) {
          this.logger.error(`❌ Failed to notify admin ${botUser.telegramNotificationId}:`, error.message);
        }
      }
    } catch (error) {
      this.logger.error('❌ Failed to notify admins:', error);
    }
  }

  private async downloadTelegramPhoto(url: string, fileId: string, botId: string): Promise<string> {
    const https = require('https');
    const fs = require('fs');
    const path = require('path');

    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `telegram-${botId}-${fileId}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(`/uploads/${filename}`);
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {});
        reject(err);
      });
    });
  }

  private toWIB(date: Date): string {
    const utcTime = date.getTime();
    const wibTime = new Date(utcTime + (14 * 60 * 60 * 1000));
    return wibTime.toISOString();
  }
}
