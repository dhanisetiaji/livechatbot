import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf } from 'telegraf';
import { Bot } from '../entities/bot.entity';
import { TelegramBotService } from './telegram-bot.service';

@Injectable()
export class MultiBotService implements OnModuleInit {
  private readonly logger = new Logger(MultiBotService.name);
  private bots: Map<string, Telegraf> = new Map();

  constructor(
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    private telegramBotService: TelegramBotService,
  ) {}

  async onModuleInit() {
    await this.startAllActiveBots();
  }

  async startAllActiveBots() {
    const activeBots = await this.botRepository.find({
      where: { isActive: true },
    });

    this.logger.log(`Starting ${activeBots.length} active bots...`);

    for (const bot of activeBots) {
      await this.startBot(bot);
    }
  }

  async startBot(bot: Bot) {
    try {
      if (this.bots.has(bot.id)) {
        this.logger.warn(`Bot ${bot.botName} already running`);
        return;
      }

      const telegrafBot = new Telegraf(bot.botToken);
      
      // Setup handlers
      this.telegramBotService.setupHandlers(telegrafBot, bot.id);

      // Store bot instance (don't launch with polling since we use webhooks)
      this.bots.set(bot.id, telegrafBot);
      this.logger.log(`✅ Bot initialized: ${bot.botName} (${bot.id})`);
    } catch (error) {
      this.logger.error(`Failed to start bot ${bot.botName}:`, error);
    }
  }

  async stopBot(botId: string) {
    const telegrafBot = this.bots.get(botId);
    if (telegrafBot) {
      try {
        // Only stop if bot was actually launched (using polling)
        // Since we use webhooks, we just remove the instance
        this.bots.delete(botId);
        this.logger.log(`🛑 Bot stopped: ${botId}`);
      } catch (error) {
        // Ignore errors when stopping
        this.bots.delete(botId);
        this.logger.warn(`Bot ${botId} stopped with warning:`, error.message);
      }
    }
  }

  async restartBot(botId: string) {
    await this.stopBot(botId);
    const bot = await this.botRepository.findOne({ where: { id: botId } });
    if (bot && bot.isActive) {
      await this.startBot(bot);
    }
  }

  async sendMessageToUser(botId: string, telegramId: number, content: string, photoPath?: string) {
    const telegrafBot = this.bots.get(botId);
    if (!telegrafBot) {
      throw new Error(`Bot ${botId} not found or not running`);
    }

    return this.telegramBotService.sendMessage(telegrafBot, telegramId, content, photoPath, botId);
  }

  async notifyAdmins(botId: string, message: string) {
    const bot = this.bots.get(botId);
    return this.telegramBotService.notifyAdmins(botId, message, bot);
  }

  getBotInstance(botId: string): Telegraf | undefined {
    return this.bots.get(botId);
  }
}
