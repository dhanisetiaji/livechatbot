import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Bot } from './bot.entity';

export enum MessageSender {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: MessageSender })
  sender: MessageSender;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'text', nullable: true })
  photoUrl: string | null;

  @Column({ nullable: true })
  botId: string;

  @ManyToOne(() => Bot, bot => bot.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'botId' })
  bot: Bot;

  @ManyToOne(() => User, user => user.messages)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}
