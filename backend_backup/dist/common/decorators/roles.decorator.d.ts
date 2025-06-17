import { UserPermission } from '../../users/user.entity';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserPermission[]) => import("@nestjs/common").CustomDecorator<string>;
