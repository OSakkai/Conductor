import { 
  Controller, 
  Post, 
  Body, 
  Get, 
  UseGuards, 
  Request, 
  HttpCode, 
  HttpStatus,
  Headers,
} from '@nestjs/common';
// ✅ CORREÇÃO: Removido ThrottlerGuard - dependência não verificada
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { LoginDto } from '../common/dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  // ✅ CORREÇÃO: Login sem rate limiting até dependência ser instalada
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // ✅ FASE 1: Registro público
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // ✅ FASE 1: Profile protegido
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    try {
      // Buscar dados atualizados do usuário
      const user = await this.usersService.findById(req.user.userId || req.user.sub);
      
      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
        };
      }

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Perfil do usuário',
        user: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          celular: user.celular,
          funcao: user.funcao,
          permissao: user.permissao,
          status: user.status,
          data_criacao: user.data_criacao,
          ultimo_login: user.ultimo_login,
        },
      };
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      return {
        success: false,
        message: 'Erro ao carregar perfil',
      };
    }
  }

  // ✅ FASE 1: Validação de token pública implementada
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Body() body: { token: string }) {
    if (!body.token) {
      return {
        success: false,
        valid: false,
        message: 'Token não fornecido',
      };
    }

    return this.authService.validateToken(body.token);
  }

  // ✅ FASE 1: Validação de token via header (alternativa)
  @Get('validate')
  @UseGuards(JwtAuthGuard)
  async validateTokenHeader(@Request() req) {
    try {
      const user = await this.usersService.findById(req.user.userId || req.user.sub);
      
      if (!user) {
        return {
          success: false,
          valid: false,
          message: 'Usuário não encontrado',
        };
      }

      return {
        success: true,
        valid: true,
        message: 'Token válido',
        user: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          permissao: user.permissao,
          funcao: user.funcao,
          status: user.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        message: 'Token inválido',
      };
    }
  }

  // ✅ FASE 3: Logout com invalidação de token
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') authHeader: string) {
    try {
      // Extrair token do header
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) {
        return {
          success: false,
          message: 'Token não fornecido',
        };
      }

      return this.authService.logout(token);
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      return {
        success: false,
        message: 'Erro no logout',
      };
    }
  }

  // ✅ FASE 3: Refresh token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { token: string }) {
    if (!body.token) {
      return {
        success: false,
        message: 'Token não fornecido',
      };
    }

    return this.authService.refreshToken(body.token);
  }

  // ✅ FASE 4: Health check melhorado
  @Get('health')
  async healthCheck() {
    try {
      // Testar conexão com banco via UsersService
      const userCount = await this.usersService.count();
      
      return {
        success: true,
        message: 'Auth API está funcionando!',
        timestamp: new Date().toISOString(),
        status: 'OK',
        database: 'Connected',
        userCount,
        version: '1.0.0',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Auth API com problemas',
        timestamp: new Date().toISOString(),
        status: 'ERROR',
        database: 'Disconnected',
        error: error.message,
      };
    }
  }

  // ✅ FASE 4: Test endpoint para debugging
  @Get('test')
  async test() {
    return {
      success: true,
      message: 'API está funcionando!',
      timestamp: new Date().toISOString(),
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      jwt_configured: !!process.env.JWT_SECRET,
    };
  }
}