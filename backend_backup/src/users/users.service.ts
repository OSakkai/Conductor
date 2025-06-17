import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      select: ['id', 'nome_usuario', 'funcao', 'permissao', 'email', 'celular', 'status', 'data_criacao', 'ultimo_login'],
    });
  }

  async findByUsername(nome_usuario: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { nome_usuario },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: ['id', 'nome_usuario', 'funcao', 'permissao', 'email', 'celular', 'status', 'data_criacao', 'ultimo_login'],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    // Verificar se usuário já existe
    const existingUser = await this.findByUsername(userData.nome_usuario);
    if (existingUser) {
      throw new ConflictException('Nome de usuário já existe');
    }

    const existingEmail = await this.findByEmail(userData.email);
    if (existingEmail) {
      throw new ConflictException('Email já está em uso');
    }

    // Hash da senha
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.senha, saltRounds);

    const user = this.usersRepository.create({
      ...userData,
      senha: hashedPassword,
    });

    const savedUser = await this.usersRepository.save(user);
    
    // Retornar sem a senha
    const { senha, ...result } = savedUser;
    return result as User;
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      ultimo_login: new Date(),
    });
  }

  async updateUser(id: number, updateData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Se estiver atualizando a senha, fazer o hash
    if (updateData.senha) {
      const saltRounds = 10;
      updateData.senha = await bcrypt.hash(updateData.senha, saltRounds);
    }

    await this.usersRepository.update(id, updateData);
    return this.findById(id);
  }

  async deactivateUser(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.update(id, {
      status: UserStatus.INATIVO,
    });
  }
}