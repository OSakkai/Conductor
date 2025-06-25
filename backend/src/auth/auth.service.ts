// ===============================================
// CONDUCTOR - AUTH SERVICE COMPLETO COM CORREÇÃO
// backend/src/auth/auth.service.ts
// CORREÇÃO: Usar validateAndConsumeKey() para chaves single_use
// ===============================================

import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ChavesService } from '../chaves/chaves.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { UserPermission } from '../users/user.entity';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  private invalidatedTokens = new Set<string>(); // ✅ FASE 3: Token blacklist para logout

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    // ✅ NOVA DEPENDÊNCIA: ChavesService com forwardRef
    @Inject(forwardRef(() => ChavesService))
    private chavesService: ChavesService,
  ) {}

  // ===============================================
  // LOGIN - MANTIDO 100% ORIGINAL
  // ===============================================
  
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

  // ===============================================
  // REGISTER - CORRIGIDO COM validateAndConsumeKey
  // ===============================================
  
  async register(createUserDto: CreateUserDto) {
    try {
      console.log('📝 Tentativa de registro para:', createUserDto.nome_usuario);
      console.log('📝 DEBUG REGISTRO - Dados recebidos:', {
        nome_usuario: createUserDto.nome_usuario,
        email: createUserDto.email,
        funcao: createUserDto.funcao,
        permissao: createUserDto.permissao,
        chave_acesso: createUserDto.chave_acesso || 'NENHUMA'
      });

      // ===============================================
      // CORREÇÃO: VALIDAÇÃO E CONSUMO DE CHAVE
      // ===============================================
      
      let permissaoFinal: UserPermission = UserPermission.VISITANTE;
      
      if (createUserDto.chave_acesso && createUserDto.chave_acesso.trim()) {
        console.log('🔑 [CHAVE] Validando e consumindo chave:', createUserDto.chave_acesso);
        
        try {
          // ✅ CORREÇÃO PRINCIPAL: Usar validateAndConsumeKey() 
          if (this.chavesService && typeof this.chavesService.validateAndConsumeKey === 'function') {
            console.log('🔑 [CHAVE] Usando método validateAndConsumeKey...');
            const validacao = await this.chavesService.validateAndConsumeKey(createUserDto.chave_acesso);
            
            if (validacao && validacao.isValid && validacao.permission) {
              // Converter string para enum
              const permissaoEnum = Object.values(UserPermission).find(p => p === validacao.permission);
              if (permissaoEnum) {
                permissaoFinal = permissaoEnum;
                console.log('✅ [CHAVE] Chave válida e consumida! Permissão atribuída:', permissaoFinal);
                console.log('✅ [CHAVE] Status do consumo:', validacao.consumed ? 'Consumida com sucesso' : 'Não foi consumida');
                console.log('✅ [CHAVE] Mensagem:', validacao.message);
              } else {
                console.warn('⚠️ [CHAVE] Permissão retornada não é válida:', validacao.permission);
                throw new BadRequestException('Chave retornou permissão inválida');
              }
            } else {
              console.log('❌ [CHAVE] Falha na validação/consumo:', validacao?.message || 'Resposta inválida');
              throw new BadRequestException(`Chave de acesso inválida: ${validacao?.message || 'Chave não encontrada'}`);
            }
          } 
          // ✅ FALLBACK: Se validateAndConsumeKey não existir, usar método antigo
          else if (this.chavesService && typeof this.chavesService.validateKey === 'function') {
            console.warn('⚠️ [CHAVE] Método validateAndConsumeKey não encontrado, usando validateKey (não recomendado)');
            const validacao = await this.chavesService.validateKey(createUserDto.chave_acesso);
            
            if (validacao && validacao.isValid && validacao.permission) {
              const permissaoEnum = Object.values(UserPermission).find(p => p === validacao.permission);
              if (permissaoEnum) {
                permissaoFinal = permissaoEnum;
                console.log('✅ [CHAVE] Chave válida! Permissão atribuída:', permissaoFinal);
                console.warn('⚠️ [CHAVE] AVISO: Usando método antigo que pode consumir chave prematuramente');
              } else {
                console.warn('⚠️ [CHAVE] Permissão retornada não é válida:', validacao.permission);
                throw new BadRequestException('Chave retornou permissão inválida');
              }
            } else {
              console.log('❌ [CHAVE] Chave inválida:', validacao?.message || 'Resposta inválida');
              throw new BadRequestException(`Chave de acesso inválida: ${validacao?.message || 'Chave não encontrada'}`);
            }
          } else {
            console.warn('⚠️ [CHAVE] ChavesService não disponível - ignorando chave');
            console.warn('⚠️ [CHAVE] Métodos disponíveis:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.chavesService || {})));
          }
        } catch (chaveError) {
          console.error('❌ [CHAVE] Erro ao processar chave:', chaveError);
          if (chaveError instanceof BadRequestException) {
            throw chaveError;
          }
          throw new BadRequestException(`Erro interno ao processar chave: ${chaveError.message}`);
        }
      } else {
        console.log('⚠️ [CHAVE] Nenhuma chave fornecida - usuário será Visitante');
      }

      // ===============================================
      // CÓDIGO ORIGINAL - VERIFICAÇÕES DE UNICIDADE
      // ===============================================
      
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

      // ✅ MODIFICAÇÃO: Criar userData com permissão da chave
      const userData: CreateUserDto = {
        ...createUserDto,
        senha: hashedPassword,
        permissao: permissaoFinal, // ✅ Usar permissão da chave
      };
      
      // ✅ CORREÇÃO: Remover chave_acesso antes de enviar para UsersService
      delete userData.chave_acesso;

      console.log('📝 DEBUG - Chamando usersService.create...');
      const user = await this.usersService.create(userData);
      console.log('📝 DEBUG - Usuário retornado do service:', user ? {
        id: user.id,
        nome_usuario: user.nome_usuario,
        permissao: user.permissao,
        status: user.status
      } : 'NULL');

      if (!user) {
        throw new BadRequestException('Falha ao criar usuário');
      }

      console.log('✅ DEBUG FINAL - Usuário criado:', {
        id: user.id,
        nome_usuario: user.nome_usuario,
        email: user.email,
        permissao: user.permissao,
        funcao: user.funcao,
        data_criacao: user.data_criacao
      });

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          funcao: user.funcao,
          permissao: user.permissao,
          status: user.status,
          data_criacao: user.data_criacao,
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

  // ===============================================
  // OUTROS MÉTODOS - MANTIDOS ORIGINAIS
  // ===============================================
  
  async validateToken(token: string) {
    try {
      // ✅ FASE 3: Verificar blacklist
      if (this.invalidatedTokens.has(token)) {
        return {
          success: false,
          valid: false,
          message: 'Token invalidado',
        };
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      
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
  async logout(token: string) {
    try {
      // Adicionar token à blacklist
      this.invalidatedTokens.add(token);
      
      // ✅ FASE 4: Limpeza automática da blacklist (evitar memory leak)
      setTimeout(() => {
        this.invalidatedTokens.delete(token);
      }, 24 * 60 * 60 * 1000); // Remove após 24h
      
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
  async refreshToken(token: string) {
    try {
      // Verificar se token não está na blacklist
      if (this.invalidatedTokens.has(token)) {
        throw new UnauthorizedException('Token invalidado');
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);
      
      if (!user || !user.isActive()) {
        throw new UnauthorizedException('Usuário inválido ou inativo');
      }

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

      // Invalidar token antigo
      this.invalidatedTokens.add(token);

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
      throw new UnauthorizedException('Token inválido para renovação');
    }
  }
}