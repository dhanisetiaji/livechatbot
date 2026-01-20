import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { UploadController } from './chat.upload.controller';
import { ChatService } from './chat.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { Bot } from '../entities/bot.entity';
import { BotUser } from '../entities/bot-user.entity';
import { TelegramModule } from '../telegram/telegram.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Message, Bot, BotUser]),
    TelegramModule,
    EventsModule,
  ],
  controllers: [ChatController, UploadController],
  providers: [ChatService],
})
export class ChatModule {}
