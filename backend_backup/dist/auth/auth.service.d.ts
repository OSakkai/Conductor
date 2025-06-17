import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from '../common/dto/login.dto';
import { CreateUserDto } from '../common/dto/create-user.dto';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            nome_usuario: string;
            funcao: import("../users/user.entity").UserRole;
            permissao: import("../users/user.entity").UserPermission;
            email: string;
            celular: string;
            status: import("../users/user.entity").UserStatus.ATIVO;
        };
    }>;
    register(createUserDto: CreateUserDto): Promise<{
        message: string;
        user: {
            id: number;
            nome_usuario: string;
            funcao: import("../users/user.entity").UserRole;
            permissao: import("../users/user.entity").UserPermission;
            email: string;
        };
    }>;
    validateToken(token: string): Promise<{
        valid: boolean;
        user: {
            id: number;
            nome_usuario: string;
            funcao: import("../users/user.entity").UserRole;
            permissao: import("../users/user.entity").UserPermission;
        };
        message?: undefined;
    } | {
        valid: boolean;
        message: string;
        user?: undefined;
    }>;
}
