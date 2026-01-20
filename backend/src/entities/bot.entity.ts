import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { BotUser } from './bot-user.entity';
import { User } from './user.entity';
import { Message } from './message.entity';

@Entity('bots')
export class Bot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  botToken: string;

  @Column()
  botName: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => BotUser, botUser => botUser.bot)
  botUsers: BotUser[];

  @OneToMany(() => User, user => user.bot)
  telegramUsers: User[];

  @OneToMany(() => Message, message => message.bot)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
