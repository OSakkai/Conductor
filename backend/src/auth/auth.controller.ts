// ===============================================
// CONDUCTOR - AUTH CONTROLLER CORRIGIDO
// backend/src/auth/auth.controller.ts
// ===============================================

import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

// DTOs
interface LoginDto {
  username: string;
  password: string;
}

interface RegisterDto {
  username: string;
  email: string;
  password: string;
  phone?: string;
  function?: string;
  accessKey?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    // 🔧 CORREÇÃO: Extrair campos do DTO
    const loginData = {
      username: loginDto.username,
      password: loginDto.password
    };
    return this.authService.login(loginData);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    // 🔧 CORREÇÃO: Usar método unificado de registro
    return this.authService.register(registerDto);
  }

  @Get('first-user')
  async checkFirstUser() {
    const isFirstUser = await this.authService.isFirstUser();
    return {
      isFirstUser,
      message: isFirstUser 
        ? 'Este será o primeiro usuário do sistema (Desenvolvedor)' 
        : 'Sistema já possui usuários'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return {
      user: req.user,
      message: 'Perfil obtido com sucesso'
    };
  }

  @Post('validate-token')
  async validateToken(@Body() body: { token: string }) {
    return this.authService.validateToken(body.token);
  }

  @Post('check-key')
  async checkAccessKey(@Body() body: { chave: string }) {
    if (!body.chave) {
      return {
        valid: false,
        message: 'Código da chave é obrigatório'
      };
    }

    const result = await this.authService.checkAccessKey(body.chave);
    return {
      valid: result.isValid,
      permission: result.permission,
      message: result.message
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body() body: { token: string }) {
    return this.authService.logout(body.token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getRegistrationStats() {
    return this.authService.getRegistrationStats();
  }
}