import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/auth-user.entity';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
