import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from '../common/dto/login.dto';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserPermission } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    // Verificar se é o primeiro usuário do sistema
    const isFirstUser = await this.authService.isFirstUser();
    
    if (isFirstUser) {
      // Primeiro usuário vira Desenvolvedor automaticamente
      return this.authService.registerFirstUser(createUserDto);
    }
    
    // Verificar se tem chave de acesso
    if (createUserDto.chave_acesso) {
      return this.authService.registerWithKey(createUserDto);
    }
    
    // Registro público normal (vira Visitante)
    return this.authService.registerPublic(createUserDto);
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
    return this.authService.validateToken(body.token);
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