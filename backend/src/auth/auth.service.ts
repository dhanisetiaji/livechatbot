import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '../entities/auth-user.entity';
import { BotUser } from '../entities/bot-user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AuthUser)
    private authUserRepository: Repository<AuthUser>,
    @InjectRepository(BotUser)
    private botUserRepository: Repository<BotUser>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.authUserRepository.findOne({
      where: { username },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get assigned bots
    const botUsers = await this.botUserRepository.find({
      where: { authUserId: user.id },
      relations: ['bot'],
    });

    const payload = { 
      username: user.username, 
      sub: user.id, 
      role: user.role 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        bots: botUsers.map(bu => ({
          id: bu.bot.id,
          name: bu.bot.botName,
          telegramNotificationId: bu.telegramNotificationId,
        })),
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.authUserRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash and update new password
    user.password = await this.hashPassword(newPassword);
    await this.authUserRepository.save(user);

    return { success: true, message: 'Password changed successfully' };
  }
}
