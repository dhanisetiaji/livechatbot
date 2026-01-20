import { Controller, Post, Body, Param, Logger } from '@nestjs/common';
import { MultiBotService } from './multi-bot.service';

@Controller('api/telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private multiBotService: MultiBotService) {}

  @Post('webhook/:botId')
  async handleWebhook(@Param('botId') botId: string, @Body() update: any) {
    try {
      this.logger.log(`📥 Received webhook update for bot ${botId}`);
      this.logger.debug(`Update content: ${JSON.stringify(update)}`);
      
      const bot = this.multiBotService.getBotInstance(botId);
      if (!bot) {
        this.logger.warn(`❌ Bot ${botId} not found or not running`);
        return { ok: false, message: 'Bot not found' };
      }

      // Process update with Telegraf
      await bot.handleUpdate(update);
      this.logger.log(`✅ Successfully processed update for bot ${botId}`);
      
      // Send notification to admins
      if (update.message && update.message.from) {
        const from = update.message.from;
        const text = update.message.text || '[Non-text message]';
        this.logger.log(`📤 Sending notification to admins about message from ${from.first_name}`);
        
        await this.multiBotService.notifyAdmins(botId,
          `🔔 Pesan baru dari ${from.first_name || 'User'}!\n\n` +
          `Telegram ID: ${from.id}\n` +
          `Username: @${from.username || 'N/A'}\n` +
          `Pesan: ${text}`
        );
        
        this.logger.log(`✅ Notification request completed`);
      } else {
        this.logger.log(`ℹ️ Update is not a message, skipping notification`);
      }
      
      return { ok: true };
    } catch (error) {
      this.logger.error(`❌ Error handling webhook for bot ${botId}:`, error);
      return { ok: false, message: error.message };
    }
  }
}
