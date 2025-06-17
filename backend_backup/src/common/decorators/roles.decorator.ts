import { SetMetadata } from '@nestjs/common';
import { UserPermission } from '../../users/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserPermission[]) => SetMetadata(ROLES_KEY, roles);