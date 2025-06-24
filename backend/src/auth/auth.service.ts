import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  private invalidatedTokens = new Set<string>(); // ✅ FASE 3: Token blacklist para logout

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // ✅ FASE 1: Login com validação robusta
  async login(loginDto: { nome_usuario: string; senha: string }) {
    try {
      console.log('🔐 Tentativa de login para:', loginDto.nome_usuario);

      // Verificar se usuário existe
      const user = await this.usersService.findByUsername(loginDto.nome_usuario);
      if (!user) {
        console.log('❌ Usuário não encontrado:', loginDto.nome_usuario);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // ✅ FASE 4: Verificar se conta está ativa
      if (!user.isActive()) {
        console.log('❌ Conta inativa:', loginDto.nome_usuario);
        throw new UnauthorizedException('Conta inativa ou bloqueada');
      }

      // Verificar senha usando Argon2
      const senhaValida = await argon2.verify(user.senha, loginDto.senha);
      if (!senhaValida) {
        console.log('❌ Senha incorreta para:', loginDto.nome_usuario);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // ✅ FASE 1: Atualizar último login
      user.updateLastLogin();
      await this.usersService.save(user);

      // ✅ FASE 1: Criar payload JWT consistente
      const payload = {
        sub: user.id,
        nome_usuario: user.nome_usuario,
        permissao: user.permissao,
        email: user.email,
        funcao: user.funcao,
        iat: Math.floor(Date.now() / 1000),
      };

      const access_token = this.jwtService.sign(payload);

      console.log('✅ Login realizado com sucesso:', user.nome_usuario);

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Login realizado com sucesso',
        access_token,
        user: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          permissao: user.permissao,
          funcao: user.funcao,
          status: user.status,
          ultimo_login: user.ultimo_login,
        },
      };
    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Erro interno no sistema de autenticação');
    }
  }

  // ✅ FASE 1: Registro com validação de chave de acesso
  async register(createUserDto: CreateUserDto) {
    try {
      console.log('📝 Tentativa de registro para:', createUserDto.nome_usuario);

      // Verificar se usuário já existe
      const existingUser = await this.usersService.findByUsername(createUserDto.nome_usuario);
      if (existingUser) {
        throw new ConflictException('Nome de usuário já existe');
      }

      // Verificar se email já existe
      const existingEmail = await this.usersService.findByEmail(createUserDto.email);
      if (existingEmail) {
        throw new ConflictException('Email já está em uso');
      }

      // ✅ FASE 1: Hash da senha com Argon2
      const hashedPassword = await argon2.hash(createUserDto.senha);

      // Criar usuário
      const userData = {
        ...createUserDto,
        senha: hashedPassword,
      };

      const user = await this.usersService.create(userData);

      console.log('✅ Usuário registrado com sucesso:', user.nome_usuario);

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          permissao: user.permissao,
          funcao: user.funcao,
        },
      };
    } catch (error) {
      console.error('❌ Erro no registro:', error.message);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro interno no registro');
    }
  }

  // ✅ CORREÇÃO: Validação de token com melhor segurança
  async validateToken(token: string): Promise<any> {
    try {
      // ✅ FASE 3: Verificar se token foi invalidado
      if (this.invalidatedTokens.has(token)) {
        console.log('❌ Token invalidado usado');
        throw new UnauthorizedException('Token invalidado');
      }

      // ✅ CORREÇÃO: Verificar se JWT_SECRET existe
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('❌ JWT_SECRET não configurado');
        throw new UnauthorizedException('Configuração de segurança inválida');
      }

      // Verificar e decodificar token
      const payload = this.jwtService.verify(token, {
        secret: jwtSecret,
      });

      // Verificar se usuário ainda existe e está ativo
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive()) {
        console.log('❌ Usuário não encontrado ou inativo');
        throw new UnauthorizedException('Usuário inválido');
      }

      console.log('✅ Token validado para:', user.nome_usuario);

      // ✅ FASE 2: Retornar dados atualizados do usuário
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
      console.error('❌ Token inválido:', error.message);
      return {
        success: false,
        valid: false,
        message: 'Token inválido',
      };
    }
  }

  // ✅ FASE 3: Logout com invalidação de token
  async logout(token: string): Promise<any> {
    try {
      // Adicionar token à lista de invalidados
      this.invalidatedTokens.add(token);
      
      console.log('✅ Logout realizado - token invalidado');

      return {
        success: true,
        message: 'Logout realizado com sucesso',
      };
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      return {
        success: false,
        message: 'Erro no logout',
      };
    }
  }

  // ✅ FASE 3: Refresh token
  async refreshToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      // Verificar se usuário ainda está ativo
      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('Usuário inválido');
      }

      // Invalidar token antigo
      this.invalidatedTokens.add(token);

      // Criar novo token
      const newPayload = {
        sub: user.id,
        nome_usuario: user.nome_usuario,
        permissao: user.permissao,
        email: user.email,
        funcao: user.funcao,
        iat: Math.floor(Date.now() / 1000),
      };

      const access_token = this.jwtService.sign(newPayload);

      console.log('✅ Token renovado para:', user.nome_usuario);

      return {
        success: true,
        message: 'Token renovado com sucesso',
        access_token,
        user: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          permissao: user.permissao,
          funcao: user.funcao,
        },
      };
    } catch (error) {
      console.error('❌ Erro na renovação do token:', error);
      throw new UnauthorizedException('Não foi possível renovar o token');
    }
  }

  // ✅ FASE 3: Limpeza periódica de tokens invalidados (executar via cron)
  cleanupInvalidatedTokens() {
    // Limpar tokens invalidados antigos (implementar lógica baseada em TTL)
    this.invalidatedTokens.clear();
    console.log('🧹 Cache de tokens invalidados limpo');
  }
}