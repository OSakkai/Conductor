import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User, UserRole, UserPermission, UserStatus } from '../users/user.entity';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: { nome_usuario: string; senha: string }) {
    // Buscar usuário
    const user = await this.usersService.findByUsername(loginDto.nome_usuario);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar senha
    const isPasswordValid = await argon2.verify(user.senha, loginDto.senha);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Atualizar último login
    await this.usersService.updateLastLogin(user.id);

    // Gerar token JWT
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

  async register(registerDto: {
    nome_usuario: string;
    email: string;
    celular?: string;
    funcao: string;
    senha: string;
    chave_acesso?: string;
  }) {
    try {
      // Verificar se é o primeiro usuário
      const userCount = await this.usersService.getUserCount();
      
      // Determinar permissão baseada na posição e chave de acesso
      let permissao: UserPermission;
      
      if (userCount === 0) {
        // Primeiro usuário sempre é Desenvolvedor
        permissao = UserPermission.DESENVOLVEDOR;
      } else if (registerDto.chave_acesso) {
        // TODO: Validar chave de acesso aqui
        // Por enquanto, dar permissão de Usuário para quem tem chave
        permissao = UserPermission.USUARIO;
      } else {
        // Sem chave de acesso = Visitante
        permissao = UserPermission.VISITANTE;
      }

      // 🔧 CORREÇÃO: Converter string para enum correto
      let funcaoEnum: UserRole;
      switch (registerDto.funcao) {
        case 'Estagiario':
          funcaoEnum = UserRole.ESTAGIARIO;
          break;
        case 'Gestor':
          funcaoEnum = UserRole.GESTOR;
          break;
        case 'Analista':
          funcaoEnum = UserRole.ANALISTA;
          break;
        case 'Coordenador':
          funcaoEnum = UserRole.COORDENADOR;
          break;
        case 'Diretor':
          funcaoEnum = UserRole.DIRETOR;
          break;
        default:
          funcaoEnum = UserRole.ESTAGIARIO; // Padrão
      }

      // 🔧 DADOS CORRIGIDOS COM TIPOS CORRETOS
      const userData = {
        nome_usuario: registerDto.nome_usuario,
        email: registerDto.email,
        celular: registerDto.celular || null,
        funcao: funcaoEnum, // ✅ Agora é UserRole enum
        permissao: permissao, // ✅ Agora é UserPermission enum
        senha: registerDto.senha,
        status: UserStatus.ATIVO, // ✅ Agora é UserStatus enum
      };

      const newUser = await this.usersService.create(userData);

      return {
        message: userCount === 0 
          ? 'Primeiro usuário criado com permissões de desenvolvedor!' 
          : 'Usuário criado com sucesso!',
        user: {
          id: newUser.id,
          nome_usuario: newUser.nome_usuario,
          funcao: newUser.funcao,
          permissao: newUser.permissao,
          email: newUser.email,
          status: newUser.status,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Erro ao criar usuário: ' + error.message);
    }
  }

  async validateUser(payload: any): Promise<any> {
    const user = await this.usersService.findById(payload.sub);
    if (user && user.status === UserStatus.ATIVO) {
      return user;
    }
    return null;
  }
}