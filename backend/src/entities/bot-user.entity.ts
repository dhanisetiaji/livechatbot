import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Bot } from './bot.entity';
import { AuthUser } from './auth-user.entity';

@Entity('bot_users')
export class BotUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  botId: string;

  @Column()
  authUserId: string;

  @Column({ type: 'bigint', nullable: true })
  telegramNotificationId: string; // Telegram ID untuk notifikasi (optional)

  @ManyToOne(() => Bot, bot => bot.botUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'botId' })
  bot: Bot;

  @ManyToOne(() => AuthUser, authUser => authUser.botUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authUserId' })
  authUser: AuthUser;

  @CreateDateColumn()
  createdAt: Date;
}
