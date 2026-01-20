import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bot } from '../entities/bot.entity';
import { CreateBotDto, UpdateBotDto } from './dto/bot.dto';
import { MultiBotService } from '../telegram/multi-bot.service';

@Injectable()
export class BotService {
  constructor(
    @InjectRepository(Bot)
    private botRepository: Repository<Bot>,
    private multiBotService: MultiBotService,
  ) {}

  async create(createBotDto: CreateBotDto): Promise<Bot> {
    // Check if bot token already exists
    const existing = await this.botRepository.findOne({
      where: { botToken: createBotDto.botToken },
    });

    if (existing) {
      throw new ConflictException('Bot token already exists');
    }

    const bot = this.botRepository.create(createBotDto);
    const savedBot = await this.botRepository.save(bot);

    // Start bot if active
    if (savedBot.isActive) {
      await this.multiBotService.startBot(savedBot);
      
      // Set webhook
      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        await this.setWebhook(savedBot.id, savedBot.botToken, webhookUrl);
      }
    }

    return savedBot;
  }

  async findAll(): Promise<Bot[]> {
    return this.botRepository.find({
      relations: ['botUsers', 'botUsers.authUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Bot> {
    const bot = await this.botRepository.findOne({
      where: { id },
      relations: ['botUsers', 'botUsers.authUser'],
    });

    if (!bot) {
      throw new NotFoundException(`Bot with ID ${id} not found`);
    }

    return bot;
  }

  async update(id: string, updateBotDto: UpdateBotDto): Promise<Bot> {
    const bot = await this.findOne(id);
    const wasActive = bot.isActive;
    const oldToken = bot.botToken;

    // Check if new token conflicts
    if (updateBotDto.botToken && updateBotDto.botToken !== bot.botToken) {
      const existing = await this.botRepository.findOne({
        where: { botToken: updateBotDto.botToken },
      });

      if (existing) {
        throw new ConflictException('Bot token already exists');
      }
    }

    Object.assign(bot, updateBotDto);
    const updatedBot = await this.botRepository.save(bot);

    // Handle bot state changes
    if (wasActive && !updatedBot.isActive) {
      // Deactivate bot
      await this.multiBotService.stopBot(id);
    } else if (!wasActive && updatedBot.isActive) {
      // Activate bot
      await this.multiBotService.startBot(updatedBot);
      
      // Set webhook
      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        await this.setWebhook(id, updatedBot.botToken, webhookUrl);
      }
    } else if (wasActive && updateBotDto.botToken && updateBotDto.botToken !== oldToken) {
      // Token changed while bot is active - restart
      await this.multiBotService.stopBot(id);
      await this.multiBotService.startBot(updatedBot);
      
      // Set webhook with new token
      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        await this.setWebhook(id, updatedBot.botToken, webhookUrl);
      }
    }

    return updatedBot;
  }

  async remove(id: string): Promise<void> {
    const bot = await this.findOne(id);
    
    // Stop bot if running
    if (bot.isActive) {
      await this.multiBotService.stopBot(id);
    }
    
    await this.botRepository.remove(bot);
  }

  async toggleActive(id: string): Promise<Bot> {
    const bot = await this.findOne(id);
    bot.isActive = !bot.isActive;
    
    if (bot.isActive) {
      // Activate bot
      await this.multiBotService.startBot(bot);
      
      // Set webhook
      const webhookUrl = process.env.WEBHOOK_URL;
      if (webhookUrl) {
        await this.setWebhook(id, bot.botToken, webhookUrl);
      }
    } else {
      // Deactivate bot
      await this.multiBotService.stopBot(id);
    }
    
    return this.botRepository.save(bot);
  }

  private async setWebhook(botId: string, botToken: string, webhookUrl: string): Promise<void> {
    try {
      const url = `${webhookUrl}/api/telegram/webhook/${botId}`;
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        },
      );
      
      const data = await response.json();
      if (data.ok) {
        console.log(`✅ Webhook set for bot ${botId}: ${url}`);
      } else {
        console.error(`❌ Failed to set webhook for bot ${botId}:`, data.description);
      }
    } catch (error) {
      console.error(`❌ Error setting webhook for bot ${botId}:`, error.message);
    }
  }
}
