// ===============================================
// CONDUCTOR - AUTH SERVICE CORRIGIDO
// backend/src/auth/auth.service.ts
// ===============================================

import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ChavesService } from '../chaves/chaves.service';
import { User } from '../users/user.entity';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private chavesService: ChavesService,
    private jwtService: JwtService,
  ) {}

  // ===============================================
  // MÉTODO DE LOGIN
  // ===============================================

  async login(loginDto: { username: string; password: string }) {
    try {
      // Buscar usuário por nome de usuário
      const user = await this.usersService.findByUsername(loginDto.username);
      
      if (!user) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // Verificar senha
      const isPasswordValid = await argon2.verify(user.senha, loginDto.password);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      // Verificar se usuário está ativo
      if (user.status !== 'Ativo') {
        throw new UnauthorizedException('Usuário inativo');
      }

      // Atualizar último login
      await this.usersService.update(user.id, { ultimo_login: new Date() });

      // Gerar token JWT
      const payload = { 
        sub: user.id, 
        username: user.nome_usuario,
        permission: user.permissao 
      };

      const token = this.jwtService.sign(payload);

      return {
        access_token: token,
        user: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          permissao: user.permissao,
          funcao: user.funcao,
          status: user.status
        }
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Erro no login: ' + error.message);
    }
  }

  // ===============================================
  // MÉTODO DE REGISTRO UNIFICADO
  // ===============================================

  async register(registerDto: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    function?: string;
    accessKey?: string;
  }) {
    try {
      // Validações básicas
      if (!registerDto.username || !registerDto.email || !registerDto.password) {
        throw new BadRequestException('Nome de usuário, email e senha são obrigatórios');
      }

      // Verificar se usuário já existe
      const existingUser = await this.usersService.findByUsername(registerDto.username);
      if (existingUser) {
        throw new BadRequestException('Nome de usuário já existe');
      }

      // Verificar se email já está em uso
      const existingEmail = await this.usersService.findByEmail(registerDto.email);
      if (existingEmail) {
        throw new BadRequestException('Email já está em uso');
      }

      // Verificar se é o primeiro usuário
      const userCount = await this.usersService.count();
      let userPermission = 'Visitante';
      let isFirstUser = false;

      if (userCount === 0) {
        userPermission = 'Desenvolvedor';
        isFirstUser = true;
        console.log('🚀 Primeiro usuário do sistema - definindo como Desenvolvedor');
      } else if (registerDto.accessKey) {
        // Validar chave de acesso
        console.log(`🔑 Validando chave de acesso: ${registerDto.accessKey}`);
        
        const keyValidation = await this.chavesService.validateAndUseKey(registerDto.accessKey);
        
        if (!keyValidation.isValid) {
          throw new BadRequestException(keyValidation.message || 'Chave de acesso inválida');
        }
        
        userPermission = keyValidation.permission;
        console.log(`✅ Chave válida! Permissão concedida: ${keyValidation.permission}`);
      }

      // Criar usuário
      const userData = {
        nome_usuario: registerDto.username,
        email: registerDto.email,
        celular: registerDto.phone || null,
        funcao: registerDto.function || null,
        permissao: userPermission,
        senha: registerDto.password, // Será hasheada no UsersService
        status: 'Ativo'
      };

      const newUser = await this.usersService.create(userData);

      // Gerar token para login automático
      const payload = { 
        sub: newUser.id, 
        username: newUser.nome_usuario,
        permission: newUser.permissao 
      };

      const token = this.jwtService.sign(payload);

      return {
        message: isFirstUser 
          ? 'Primeiro usuário criado com permissões de Desenvolvedor!' 
          : `Usuário criado com permissão: ${userPermission}`,
        access_token: token,
        user: {
          id: newUser.id,
          nome_usuario: newUser.nome_usuario,
          email: newUser.email,
          permissao: newUser.permissao,
          funcao: newUser.funcao,
          status: newUser.status,
          created_with_key: !!registerDto.accessKey && !isFirstUser
        }
      };

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Erro no registro:', error);
      throw new BadRequestException('Erro no registro: ' + error.message);
    }
  }

  // ===============================================
  // VERIFICAR SE É PRIMEIRO USUÁRIO
  // ===============================================

  async isFirstUser(): Promise<boolean> {
    try {
      const userCount = await this.usersService.count();
      return userCount === 0;
    } catch (error) {
      console.error('Erro ao verificar primeiro usuário:', error);
      return false;
    }
  }

  // ===============================================
  // VALIDAÇÃO DE TOKEN
  // ===============================================

  async validateUser(payload: any): Promise<any> {
    try {
      const user = await this.usersService.findOne(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      if (user.status !== 'Ativo') {
        throw new UnauthorizedException('Usuário inativo');
      }

      return {
        id: user.id,
        nome_usuario: user.nome_usuario,
        email: user.email,
        permissao: user.permissao,
        funcao: user.funcao,
        status: user.status
      };
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.validateUser(payload);
      return {
        valid: true,
        user
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Token inválido'
      };
    }
  }

  // ===============================================
  // MÉTODOS PARA COMPATIBILIDADE COM CONTROLLER
  // ===============================================

  async registerFirstUser(userData: any) {
    return this.register(userData);
  }

  async registerWithKey(userData: any) {
    return this.register(userData);
  }

  async registerPublic(userData: any) {
    return this.register(userData);
  }

  // ===============================================
  // MÉTODOS UTILITÁRIOS
  // ===============================================

  async checkAccessKey(chaveCode: string): Promise<{ isValid: boolean; permission?: string; message?: string }> {
    try {
      const chave = await this.chavesService.findByCode(chaveCode);
      
      if (!chave) {
        return { 
          isValid: false, 
          message: 'Chave de acesso não encontrada' 
        };
      }

      if (chave.status !== 'ativa') {
        let message = 'Chave de acesso inválida';
        
        switch (chave.status) {
          case 'expirada':
            message = 'Esta chave de acesso expirou';
            break;
          case 'usada':
            message = 'Esta chave de acesso já foi utilizada';
            break;
          case 'inativa':
            message = 'Esta chave de acesso foi desativada';
            break;
        }

        return { isValid: false, message };
      }

      if (chave.data_expiracao && new Date() > chave.data_expiracao) {
        return { 
          isValid: false, 
          message: 'Esta chave de acesso expirou' 
        };
      }

      return {
        isValid: true,
        permission: chave.permissao,
        message: 'Chave de acesso válida'
      };

    } catch (error) {
      console.error('Erro ao verificar chave:', error);
      return { 
        isValid: false, 
        message: 'Erro interno ao verificar chave' 
      };
    }
  }

  async getRegistrationStats(): Promise<any> {
    try {
      const totalUsers = await this.usersService.count();

      return {
        totalUsers,
        usersWithKeys: 0, // Implementar se necessário
        usersWithoutKeys: totalUsers,
        percentageWithKeys: 0
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalUsers: 0,
        usersWithKeys: 0,
        usersWithoutKeys: 0,
        percentageWithKeys: 0
      };
    }
  }

  async logout(token: string): Promise<{ message: string }> {
    return {
      message: 'Logout realizado com sucesso'
    };
  }

  async refreshToken(user: any): Promise<{ access_token: string }> {
    const payload = { 
      sub: user.id, 
      username: user.nome_usuario,
      permission: user.permissao 
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token
    };
  }

  async checkPermissions(userId: number, requiredPermission: string): Promise<boolean> {
    try {
      const user = await this.usersService.findOne(userId);
      
      if (!user) {
        return false;
      }

      const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
      const userLevel = permissions.indexOf(user.permissao);
      const requiredLevel = permissions.indexOf(requiredPermission);

      return userLevel >= requiredLevel;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      return false;
    }
  }
}