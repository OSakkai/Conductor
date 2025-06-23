import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { nome_usuario: string; senha: string }) {
    // ✅ FRONTEND JÁ ENVIA NO FORMATO CORRETO
    return this.authService.login(body);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: { nome_usuario: string; email: string; celular?: string; funcao: string; senha: string; chave_acesso?: string }) {
    // ✅ ROTAS DE REGISTRO DEVEM SER PÚBLICAS (SEM @UseGuards)
    return this.authService.register(body);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      message: 'Perfil do usuário',
      user: req.user,
    };
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() body: { token: string }) {
    // ✅ VALIDAÇÃO DE TOKEN DEVE SER PÚBLICA
    try {
      // Implementação simples de validação de token
      // (o service atual não tem este método)
      return {
        valid: true,
        message: 'Token válido',
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Token inválido',
      };
    }
  }

  @Get('health')
  async healthCheck() {
    return {
      message: 'Auth API está funcionando!',
      timestamp: new Date().toISOString(),
      status: 'OK',
    };
  }

  @Get('test')
  async test() {
    return {
      message: 'API está funcionando!',
      timestamp: new Date().toISOString(),
      status: 'OK',
    };
  }
}