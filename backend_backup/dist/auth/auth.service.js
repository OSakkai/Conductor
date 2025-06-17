"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const bcrypt = require("bcrypt");
let AuthService = exports.AuthService = class AuthService {
    constructor(usersService, jwtService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
    }
    async login(loginDto) {
        const { nome_usuario, senha } = loginDto;
        const user = await this.usersService.findByUsername(nome_usuario);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        if (user.status !== 'Ativo') {
            throw new common_1.UnauthorizedException('Conta inativa ou bloqueada');
        }
        const isPasswordValid = await bcrypt.compare(senha, user.senha);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        await this.usersService.updateLastLogin(user.id);
        const payload = {
            sub: user.id,
            nome_usuario: user.nome_usuario,
            permissao: user.permissao,
            funcao: user.funcao,
        };
        const access_token = await this.jwtService.signAsync(payload, {
            expiresIn: '24h',
        });
        return {
            access_token,
            user: {
                id: user.id,
                nome_usuario: user.nome_usuario,
                funcao: user.funcao,
                permissao: user.permissao,
                email: user.email,
                celular: user.celular,
                status: user.status,
            },
        };
    }
    async register(createUserDto) {
        try {
            const user = await this.usersService.create(createUserDto);
            return {
                message: 'Usuário criado com sucesso',
                user: {
                    id: user.id,
                    nome_usuario: user.nome_usuario,
                    funcao: user.funcao,
                    permissao: user.permissao,
                    email: user.email,
                },
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(error.message);
        }
    }
    async validateToken(token) {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            const user = await this.usersService.findById(payload.sub);
            if (!user || user.status !== 'Ativo') {
                throw new common_1.UnauthorizedException('Token inválido ou usuário inativo');
            }
            return {
                valid: true,
                user: {
                    id: user.id,
                    nome_usuario: user.nome_usuario,
                    funcao: user.funcao,
                    permissao: user.permissao,
                },
            };
        }
        catch (error) {
            return {
                valid: false,
                message: 'Token inválido',
            };
        }
    }
};
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map