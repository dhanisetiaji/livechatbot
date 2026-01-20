import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { dataSourceOptions } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { UserManagementModule } from './user-management/user-management.module';
import { ChatModule } from './chat/chat.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthModule,
    BotModule,
    UserManagementModule,
    ChatModule,
    EventsModule,
  ],
})
export class AppModule {}
