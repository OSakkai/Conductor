import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from '../common/dto/login.dto';
import { CreateUserDto } from '../common/dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { nome_usuario, senha } = loginDto;

    // Buscar usuário
    const user = await this.usersService.findByUsername(nome_usuario);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verificar se a conta está ativa
    if (user.status !== 'Ativo') {
      throw new UnauthorizedException('Conta inativa ou bloqueada');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(senha, user.senha);
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

  async register(createUserDto: CreateUserDto) {
    try {
      const user = await this.usersService.create(createUserDto);
      return {
        message: 'Usuário criado com sucesso',
        user: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          funcao: user.funcao,
          permissao: user.permissao,
          email: user.email,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.usersService.findById(payload.sub);
      
      if (!user || user.status !== 'Ativo') {
        throw new UnauthorizedException('Token inválido ou usuário inativo');
      }

      return {
        valid: true,
        user: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          funcao: user.funcao,
          permissao: user.permissao,
        },
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Token inválido',
      };
    }
  }
}