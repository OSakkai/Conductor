import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { User, UserStatus, UserPermission } from './user.entity';
import { CreateUserDto } from '../common/dto/create-user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ✅ FASE 1: Buscar todos com filtros otimizados
  async findAll(filters?: {
    search?: string;
    permission?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    try {
      const query = this.userRepository.createQueryBuilder('user');

      // ✅ FASE 4: Aplicar filtros se fornecidos
      if (filters?.search) {
        query.andWhere(
          '(user.nome_usuario LIKE :search OR user.email LIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      if (filters?.permission && Object.values(UserPermission).includes(filters.permission as UserPermission)) {
        query.andWhere('user.permissao = :permission', { permission: filters.permission });
      }

      if (filters?.status && Object.values(UserStatus).includes(filters.status as UserStatus)) {
        query.andWhere('user.status = :status', { status: filters.status });
      }

      // ✅ FASE 4: Ordenação e paginação
      query
        .orderBy('user.data_criacao', 'DESC')
        .skip(filters?.offset || 0)
        .take(filters?.limit || 50);

      const users = await query.getMany();
      
      this.logger.debug(`Encontrados ${users.length} usuários com filtros aplicados`);
      return users;

    } catch (error) {
      this.logger.error('Erro ao buscar usuários:', error);
      return [];
    }
  }

  // ✅ FASE 1: Buscar por ID
  async findById(id: number): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (user) {
        this.logger.debug(`Usuário encontrado: ${user.nome_usuario} (ID: ${id})`);
      }
      return user;
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário por ID ${id}:`, error);
      return null;
    }
  }

  // ✅ FASE 1: Buscar por username
  async findByUsername(nome_usuario: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { nome_usuario } });
      if (user) {
        this.logger.debug(`Usuário encontrado por username: ${nome_usuario}`);
      }
      return user;
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário por username ${nome_usuario}:`, error);
      return null;
    }
  }

  // ✅ FASE 1: Buscar por email
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (user) {
        this.logger.debug(`Usuário encontrado por email: ${email}`);
      }
      return user;
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário por email ${email}:`, error);
      return null;
    }
  }

  // ✅ FASE 1: Criar usuário com validações
  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      // Verificar se username já existe
      const existingUsername = await this.findByUsername(createUserDto.nome_usuario);
      if (existingUsername) {
        throw new ConflictException('Nome de usuário já existe');
      }

      // Verificar se email já existe
      const existingEmail = await this.findByEmail(createUserDto.email);
      if (existingEmail) {
        throw new ConflictException('Email já está em uso');
      }

      // ✅ FASE 1: Hash da senha com Argon2
      const hashedPassword = await argon2.hash(createUserDto.senha);

      // Criar usuário
      const user = this.userRepository.create({
        ...createUserDto,
        senha: hashedPassword,
      });

      const savedUser = await this.userRepository.save(user);
      
      this.logger.log(`Usuário criado: ${savedUser.nome_usuario} (ID: ${savedUser.id})`);
      return savedUser;

    } catch (error) {
      this.logger.error('Erro ao criar usuário:', error);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Erro interno ao criar usuário');
    }
  }

  // ✅ FASE 1: Atualizar usuário
  async updateUser(id: number, updateData: Partial<CreateUserDto>): Promise<User | null> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // ✅ FASE 4: Verificar conflitos antes de atualizar
      if (updateData.nome_usuario && updateData.nome_usuario !== user.nome_usuario) {
        const existingUsername = await this.findByUsername(updateData.nome_usuario);
        if (existingUsername) {
          throw new ConflictException('Nome de usuário já existe');
        }
      }

      if (updateData.email && updateData.email !== user.email) {
        const existingEmail = await this.findByEmail(updateData.email);
        if (existingEmail) {
          throw new ConflictException('Email já está em uso');
        }
      }

      // ✅ FASE 1: Hash da nova senha se fornecida
      if (updateData.senha) {
        updateData.senha = await argon2.hash(updateData.senha);
      }

      // Atualizar dados
      Object.assign(user, updateData);
      const updatedUser = await this.userRepository.save(user);
      
      this.logger.log(`Usuário atualizado: ${updatedUser.nome_usuario} (ID: ${id})`);
      return updatedUser;

    } catch (error) {
      this.logger.error(`Erro ao atualizar usuário ${id}:`, error);
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      return null;
    }
  }

  // ✅ FASE 1: Desativar usuário (soft delete)
  async deactivateUser(id: number): Promise<boolean> {
    try {
      const user = await this.findById(id);
      if (!user) {
        return false;
      }

      user.status = UserStatus.INATIVO;
      await this.userRepository.save(user);
      
      this.logger.log(`Usuário desativado: ${user.nome_usuario} (ID: ${id})`);
      return true;

    } catch (error) {
      this.logger.error(`Erro ao desativar usuário ${id}:`, error);
      return false;
    }
  }

  // ✅ FASE 4: Reativar usuário
  async reactivateUser(id: number): Promise<User | null> {
    try {
      const user = await this.findById(id);
      if (!user) {
        return null;
      }

      user.status = UserStatus.ATIVO;
      const reactivatedUser = await this.userRepository.save(user);
      
      this.logger.log(`Usuário reativado: ${reactivatedUser.nome_usuario} (ID: ${id})`);
      return reactivatedUser;

    } catch (error) {
      this.logger.error(`Erro ao reativar usuário ${id}:`, error);
      return null;
    }
  }

  // ✅ FASE 1: Salvar usuário (para AuthService)
  async save(user: User): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error('Erro ao salvar usuário:', error);
      throw error;
    }
  }

  // ✅ FASE 4: Contar usuários
  async count(): Promise<number> {
    try {
      return await this.userRepository.count();
    } catch (error) {
      this.logger.error('Erro ao contar usuários:', error);
      return 0;
    }
  }

  // ✅ FASE 4: Estatísticas dos usuários
  async getStats(): Promise<any> {
    try {
      const [
        total,
        ativos,
        inativos,
        bloqueados,
        porPermissao
      ] = await Promise.all([
        this.userRepository.count(),
        this.userRepository.count({ where: { status: UserStatus.ATIVO } }),
        this.userRepository.count({ where: { status: UserStatus.INATIVO } }),
        this.userRepository.count({ where: { status: UserStatus.BLOQUEADO } }),
        this.getPermissionStats()
      ]);

      return {
        total,
        ativos,
        inativos,
        bloqueados,
        por_permissao: porPermissao,
        ultima_atualizacao: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('Erro ao gerar estatísticas:', error);
      return {
        total: 0,
        ativos: 0,
        inativos: 0,
        bloqueados: 0,
        por_permissao: {},
      };
    }
  }

  // ✅ FASE 4: Estatísticas por permissão
  private async getPermissionStats(): Promise<Record<string, number>> {
    try {
      const permissions = Object.values(UserPermission);
      const stats: Record<string, number> = {};

      for (const permission of permissions) {
        stats[permission] = await this.userRepository.count({
          where: { permissao: permission, status: UserStatus.ATIVO }
        });
      }

      return stats;

    } catch (error) {
      this.logger.error('Erro ao calcular estatísticas por permissão:', error);
      return {};
    }
  }

  // ✅ FASE 4: Buscar usuários ativos
  async findActiveUsers(): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { status: UserStatus.ATIVO },
        order: { ultimo_login: 'DESC' },
      });
    } catch (error) {
      this.logger.error('Erro ao buscar usuários ativos:', error);
      return [];
    }
  }

  // ✅ FASE 4: Buscar usuários por permissão
  async findByPermission(permission: UserPermission): Promise<User[]> {
    try {
      return await this.userRepository.find({
        where: { 
          permissao: permission,
          status: UserStatus.ATIVO 
        },
        order: { nome_usuario: 'ASC' },
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar usuários com permissão ${permission}:`, error);
      return [];
    }
  }
}