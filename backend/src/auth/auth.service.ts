import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  private invalidatedTokens = new Set<string>();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  // ✅ Login com validação robusta
  async login(loginDto: { nome_usuario: string; senha: string }) {
    try {
      console.log('🔐 Tentativa de login para:', loginDto.nome_usuario);

      // Verificar se usuário existe
      const user = await this.usersService.findByUsername(loginDto.nome_usuario);
      if (!user) {
        console.log('❌ Usuário não encontrado:', loginDto.nome_usuario);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      console.log('✅ Usuário encontrado:', {
        id: user.id,
        nome_usuario: user.nome_usuario,
        status: user.status
      });

      // Verificar se conta está ativa
      if (!user.isActive()) {
        console.log('❌ Conta inativa:', loginDto.nome_usuario);
        throw new UnauthorizedException('Conta inativa ou bloqueada');
      }

      // Verificar senha usando Argon2
      console.log('🔐 Verificando senha...');
      const senhaValida = await argon2.verify(user.senha, loginDto.senha);
      
      if (!senhaValida) {
        console.log('❌ Senha incorreta para:', loginDto.nome_usuario);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      console.log('✅ Senha válida! Prosseguindo com login...');

      // Atualizar último login
      user.updateLastLogin();
      await this.usersService.save(user);

      // Criar payload JWT
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

  // ✅ Registro com validação de chave de acesso
  async register(createUserDto: CreateUserDto) {
    try {
      console.log('📝 Tentativa de registro para:', createUserDto.nome_usuario);

      // Verificar se usuário já existe
      const existingUser = await this.usersService.findByUsername(createUserDto.nome_usuario);
      if (existingUser) {
        console.log('❌ Usuário já existe:', createUserDto.nome_usuario);
        throw new ConflictException('Nome de usuário já existe');
      }

      // Verificar se email já existe
      const existingEmail = await this.usersService.findByEmail(createUserDto.email);
      if (existingEmail) {
        console.log('❌ Email já existe:', createUserDto.email);
        throw new ConflictException('Email já está em uso');
      }

      // Hash da senha com Argon2
      console.log('🔐 Gerando hash da senha...');
      const hashedPassword = await argon2.hash(createUserDto.senha);

      // Criar usuário
      const userData = {
        ...createUserDto,
        senha: hashedPassword,
      };

      console.log('📝 Criando usuário...');
      const user = await this.usersService.create(userData);

      if (!user) {
        throw new BadRequestException('Falha ao criar usuário');
      }

      console.log('✅ Usuário registrado com sucesso:', user.nome_usuario);

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
      throw new BadRequestException('Erro interno no sistema de registro');
    }
  }

  // ✅ Validação de token
  async validateToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      
      if (this.invalidatedTokens.has(token)) {
        return {
          success: false,
          valid: false,
          message: 'Token foi invalidado',
        };
      }

      const user = await this.usersService.findById(decoded.sub);
      if (!user || !user.isActive()) {
        return {
          success: false,
          valid: false,
          message: 'Usuário não encontrado ou inativo',
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
        message: 'Token inválido ou expirado',
      };
    }
  }

  // ✅ Logout com invalidação de token
  async logout(token: string) {
    try {
      this.invalidatedTokens.add(token);
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

  // ✅ Refresh token
  async refreshToken(token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      
      if (this.invalidatedTokens.has(token)) {
        throw new UnauthorizedException('Token foi invalidado');
      }

      const user = await this.usersService.findById(decoded.sub);
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('Usuário não encontrado ou inativo');
      }

      this.invalidatedTokens.add(token);

      const payload = {
        sub: user.id,
        nome_usuario: user.nome_usuario,
        permissao: user.permissao,
        email: user.email,
        funcao: user.funcao,
        iat: Math.floor(Date.now() / 1000),
      };

      const access_token = this.jwtService.sign(payload);

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
          status: user.status,
        },
      };
    } catch (error) {
      console.error('❌ Erro no refresh token:', error);
      throw new UnauthorizedException('Falha ao renovar token');
    }
  }
}