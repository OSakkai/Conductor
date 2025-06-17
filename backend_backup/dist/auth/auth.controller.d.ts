import { AuthService } from './auth.service';
import { LoginDto } from '../common/dto/login.dto';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { UserPermission } from '../users/user.entity';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            nome_usuario: string;
            funcao: import("../users/user.entity").UserRole;
            permissao: UserPermission;
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
            permissao: UserPermission;
            email: string;
        };
    }>;
    getProfile(req: any): Promise<{
        message: string;
        user: any;
    }>;
    validateToken(body: {
        token: string;
    }): Promise<{
        valid: boolean;
        user: {
            id: number;
            nome_usuario: string;
            funcao: import("../users/user.entity").UserRole;
            permissao: UserPermission;
        };
        message?: undefined;
    } | {
        valid: boolean;
        message: string;
        user?: undefined;
    }>;
    test(): Promise<{
        message: string;
        timestamp: string;
        status: string;
    }>;
}
