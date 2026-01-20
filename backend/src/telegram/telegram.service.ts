import { Update, Ctx, Start, On, InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Message, MessageSender } from '../entities/message.entity';
import { EventsGateway } from '../events/events.gateway';

@Update()
@Injectable()
export class TelegramService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectBot() private bot: Telegraf<Context>,
    private eventsGateway: EventsGateway,
  ) {}

  // Helper to convert UTC to WIB ISO string
  private toWIB(date: Date): string {
    const utcTime = date.getTime();
    const wibTime = new Date(utcTime + (14 * 60 * 60 * 1000));
    return wibTime.toISOString();
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const from = ctx.from;
    
    // Create or update user
    let user = await this.userRepository.findOne({
      where: { telegramId: from.id },
    });

    if (!user) {
      user = this.userRepository.create({
        telegramId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
      });
      await this.userRepository.save(user);
    }

    await ctx.reply(
      `Selamat datang di Live Chat Support! 👋\n\n` +
      `Silakan ketik pesan Anda dan admin kami akan segera membalas.`,
    );
  }

  @On('text')
  async onMessage(@Ctx() ctx: Context) {
    if (!('text' in ctx.message)) return;

    const from = ctx.from;
    const text = ctx.message.text;

    await this.handleUserMessage(from, text, null);
  }

  @On('photo')
  async onPhoto(@Ctx() ctx: Context) {
    if (!('photo' in ctx.message)) return;

    const from = ctx.from;
    const photo = ctx.message.photo[ctx.message.photo.length - 1]; // Get largest photo
    const caption = 'caption' in ctx.message ? ctx.message.caption : '[Photo]';

    // Download photo to server
    const fileLink = await ctx.telegram.getFileLink(photo.file_id);
    const photoPath = await this.downloadTelegramPhoto(fileLink.href, photo.file_id);
    
    await this.handleUserMessage(from, caption || '[Photo]', photoPath);
  }

  private async downloadTelegramPhoto(url: string, fileId: string): Promise<string> {
    const https = require('https');
    const fs = require('fs');
    const path = require('path');

    // Create uploads directory if not exists
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate filename
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `telegram-${fileId}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    // Download file
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

  private async handleUserMessage(from: any, text: string, photoUrl: string | null) {

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { telegramId: from.id },
    });

    if (!user) {
      user = this.userRepository.create({
        telegramId: from.id,
        firstName: from.first_name,
        lastName: from.last_name,
        username: from.username,
      });
      await this.userRepository.save(user);
    }

    // Save message
    const message = this.messageRepository.create({
      content: text,
      sender: MessageSender.USER,
      user: user,
      userId: user.id,
      photoUrl: photoUrl,
    });
    await this.messageRepository.save(message);

    // Notify admin via Telegram
    const adminChatId = process.env.ADMIN_CHAT_ID;
    if (adminChatId) {
      const adminMessage = 
        `🔔 Pesan baru dari ${user.firstName || 'User'}!\n\n` +
        `User ID: ${user.id}\n` +
        `Telegram ID: ${user.telegramId}\n` +
        `Username: @${user.username || 'N/A'}\n` +
        `Pesan: ${text}`;
      
      await this.bot.telegram.sendMessage(adminChatId, adminMessage);
    }

    // Notify admin dashboard via WebSocket
    this.eventsGateway.notifyNewMessage({
      id: message.id,
      content: message.content,
      sender: message.sender,
      createdAt: this.toWIB(message.createdAt),
      userId: user.id,
      photoUrl: photoUrl,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      },
    });
  }

  async sendMessageToUser(userId: string, content: string, photoUrl?: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Save admin message
    const message = this.messageRepository.create({
      content,
      sender: MessageSender.ADMIN,
      user: user,
      userId: user.id,
      photoUrl: photoUrl || null,
    });
    await this.messageRepository.save(message);

    // Send to Telegram user
    if (photoUrl) {
      // If photoUrl is a local file path, use InputFile
      if (photoUrl.startsWith('/uploads/')) {
        const { createReadStream } = require('fs');
        const { join } = require('path');
        const filePath = join(__dirname, '..', '..', photoUrl);
        await this.bot.telegram.sendPhoto(user.telegramId, {
          source: createReadStream(filePath),
        }, {
          caption: content,
        });
      } else if (photoUrl.startsWith('http')) {
        // If URL, send directly
        await this.bot.telegram.sendPhoto(user.telegramId, photoUrl, {
          caption: content,
        });
      } else {
        // Base64 or other format - just send text
        await this.bot.telegram.sendMessage(user.telegramId, content);
      }
    } else {
      await this.bot.telegram.sendMessage(user.telegramId, content);
    }

    return message;
  }
}
