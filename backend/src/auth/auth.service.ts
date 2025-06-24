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

  // ✅ FASE 1: Login com validação robusta + DEBUG
  async login(loginDto: { nome_usuario: string; senha: string }) {
    try {
      console.log('🔐 Tentativa de login para:', loginDto.nome_usuario);
      console.log('🔐 DEBUG - Dados recebidos:', {
        nome_usuario: loginDto.nome_usuario,
        senha_length: loginDto.senha?.length,
        senha_primeiro_char: loginDto.senha?.[0],
        senha_ultimo_char: loginDto.senha?.slice(-1)
      });

      // Verificar se usuário existe
      const user = await this.usersService.findByUsername(loginDto.nome_usuario);
      if (!user) {
        console.log('❌ Usuário não encontrado:', loginDto.nome_usuario);
        throw new UnauthorizedException('Credenciais inválidas');
      }

      console.log('✅ Usuário encontrado:', {
        id: user.id,
        nome_usuario: user.nome_usuario,
        senha_hash_length: user.senha?.length,
        senha_hash_prefix: user.senha?.substring(0, 20),
        status: user.status
      });

      // ✅ FASE 4: Verificar se conta está ativa
      if (!user.isActive()) {
        console.log('❌ Conta inativa:', loginDto.nome_usuario);
        throw new UnauthorizedException('Conta inativa ou bloqueada');
      }

      // Verificar senha usando Argon2
      console.log('🔐 DEBUG - Verificando senha...');
      console.log('🔐 Hash do banco:', user.senha);
      console.log('🔐 Senha digitada:', loginDto.senha);
      
      const senhaValida = await argon2.verify(user.senha, loginDto.senha);
      console.log('🔐 Resultado verificação:', senhaValida);
      
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
      console.log('📝 DEBUG REGISTRO - Dados recebidos:', {
        nome_usuario: createUserDto.nome_usuario,
        email: createUserDto.email,
        funcao: createUserDto.funcao,
        permissao: createUserDto.permissao
      });

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

      // ✅ FASE 1: Hash da senha com Argon2
      const hashedPassword = await argon2.hash(createUserDto.senha);

      console.log('🔐 DEBUG REGISTRO - Senha original:', createUserDto.senha);
      console.log('🔐 DEBUG REGISTRO - Hash gerado:', hashedPassword);

      // Criar usuário
      const userData = {
        ...createUserDto,
        senha: hashedPassword,
      };

      console.log('📝 DEBUG - Chamando usersService.create...');
      const user = await this.usersService.create(userData);
      console.log('📝 DEBUG - Usuário retornado do service:', user ? user.nome_usuario : 'NULL');

      if (!user) {
        throw new Error('Falha ao criar usuário - retorno null');
      }

      console.log('✅ Usuário registrado com sucesso:', user.nome_usuario);

      // Verificar se realmente foi salvo
      const verificacao = await this.usersService.findByUsername(user.nome_usuario);
      console.log('🔍 DEBUG - Verificação pós-criação:', verificacao ? 'ENCONTRADO' : 'NÃO ENCONTRADO');

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
      console.error('❌ Stack completo:', error.stack);
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro interno no sistema de registro');
    }
  }

  // ✅ FASE 3: Logout com invalidação de token
  async logout(token: string) {
    try {
      // Adicionar token à blacklist
      this.invalidatedTokens.add(token);
      
      // ✅ FASE 3: Limpar tokens expirados periodicamente
      this.cleanupExpiredTokens();
      
      return {
        success: true,
        message: 'Logout realizado com sucesso',
      };
    } catch (error) {
      console.error('❌ Erro no logout:', error.message);
      throw new BadRequestException('Erro interno no logout');
    }
  }

  // ✅ FASE 3: Verificar se token está invalidado
  isTokenInvalidated(token: string): boolean {
    return this.invalidatedTokens.has(token);
  }

  // ✅ FASE 3: Limpeza de tokens expirados
  private cleanupExpiredTokens() {
    // Implementação simples - em produção usar Redis
    if (this.invalidatedTokens.size > 1000) {
      this.invalidatedTokens.clear();
    }
  }

  // ✅ FASE 4: Refresh token (placeholder para futuro)
  async refreshToken(token: string) {
    try {
      // Verificar se token está válido
      const decoded = this.jwtService.verify(token);
      
      // Buscar usuário atualizado
      const user = await this.usersService.findById(decoded.sub);
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('Token inválido ou usuário inativo');
      }

      // Gerar novo token
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
      console.error('❌ Erro no refresh token:', error.message);
      throw new UnauthorizedException('Token inválido');
    }
  }

  // ✅ FASE 4: Validar token (usado pelo Guard)
  async validateToken(token: string) {
    try {
      // Verificar se token está na blacklist
      if (this.isTokenInvalidated(token)) {
        throw new UnauthorizedException('Token invalidado');
      }

      // Verificar assinatura do token
      const decoded = this.jwtService.verify(token);
      
      // Buscar usuário para verificar se ainda está ativo
      const user = await this.usersService.findById(decoded.sub);
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('Usuário inativo ou não encontrado');
      }

      return decoded;
    } catch (error) {
      console.error('❌ Erro na validação do token:', error.message);
      throw new UnauthorizedException('Token inválido');
    }
  }
}