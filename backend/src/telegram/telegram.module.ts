import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MultiBotService } from './multi-bot.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramController } from './telegram.controller';
import { Bot } from '../entities/bot.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { BotUser } from '../entities/bot-user.entity';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bot, User, Message, BotUser]),
    EventsModule,
  ],
  controllers: [TelegramController],
  providers: [MultiBotService, TelegramBotService],
  exports: [MultiBotService, TelegramBotService],
})
export class TelegramModule {}
