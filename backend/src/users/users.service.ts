import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus, UserPermission, UserRole } from './user.entity';
import * as argon2 from 'argon2';

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

  async getUserCount(): Promise<number> {
    return this.usersRepository.count();
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
    const hashedPassword = await argon2.hash(userData.senha);

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
      updateData.senha = await argon2.hash(updateData.senha);
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

  // ===============================================
  // 🆕 MÉTODOS ADICIONAIS PARA INTEGRAÇÃO COMPLETA
  // ===============================================

  /**
   * Criar usuário (alias para create) - Para compatibilidade
   */
  async createUser(userData: any): Promise<User> {
    return this.create(userData);
  }

  /**
   * Contar total de usuários (alias para getUserCount)
   */
  async count(): Promise<number> {
    return this.getUserCount();
  }

  /**
   * Buscar usuário por ID (alias para findById) - Para compatibilidade
   */
  async findOne(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }
    return user;
  }

  /**
   * Atualizar usuário (alias para updateUser) - Para compatibilidade
   */
  async update(id: number, updateData: Partial<User>): Promise<User> {
    return this.updateUser(id, updateData);
  }

  /**
   * Ativar usuário
   */
  async activateUser(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.usersRepository.update(id, {
      status: UserStatus.ATIVO,
    });
  }

  /**
   * Alternar status do usuário (ativo/inativo)
   */
  async toggleUserStatus(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const newStatus = user.status === UserStatus.ATIVO ? UserStatus.INATIVO : UserStatus.ATIVO;
    
    await this.usersRepository.update(id, {
      status: newStatus,
    });

    return this.findById(id);
  }

  /**
   * 🔧 Buscar usuários por permissão (CORRIGIDO COM ENUM)
   */
  async findByPermission(permissao: UserPermission): Promise<User[]> {
    return this.usersRepository.find({
      where: { permissao },
      select: ['id', 'nome_usuario', 'funcao', 'permissao', 'email', 'celular', 'status', 'data_criacao', 'ultimo_login'],
    });
  }

  /**
   * 🆕 Versão de findByPermission que aceita string
   */
  async findByPermissionString(permissao: string): Promise<User[]> {
    const permissionEnum = this.stringToUserPermission(permissao);
    return this.findByPermission(permissionEnum);
  }

  /**
   * 🔧 Buscar usuários por função (NOVO)
   */
  async findByRole(funcao: UserRole): Promise<User[]> {
    return this.usersRepository.find({
      where: { funcao },
      select: ['id', 'nome_usuario', 'funcao', 'permissao', 'email', 'celular', 'status', 'data_criacao', 'ultimo_login'],
    });
  }

  /**
   * 🆕 Versão de findByRole que aceita string
   */
  async findByRoleString(funcao: string): Promise<User[]> {
    const roleEnum = this.stringToUserRole(funcao);
    return this.findByRole(roleEnum);
  }

  /**
   * Buscar usuários por status
   */
  async findByStatus(status: UserStatus): Promise<User[]> {
    return this.usersRepository.find({
      where: { status },
      select: ['id', 'nome_usuario', 'funcao', 'permissao', 'email', 'celular', 'status', 'data_criacao', 'ultimo_login'],
    });
  }

  /**
   * Buscar usuários ativos
   */
  async findActiveUsers(): Promise<User[]> {
    return this.findByStatus(UserStatus.ATIVO);
  }

  /**
   * Buscar usuários inativos
   */
  async findInactiveUsers(): Promise<User[]> {
    return this.findByStatus(UserStatus.INATIVO);
  }

  /**
   * Contar usuários por status
   */
  async countByStatus(): Promise<{ ativos: number; inativos: number }> {
    const [ativos, inativos] = await Promise.all([
      this.usersRepository.count({ where: { status: UserStatus.ATIVO } }),
      this.usersRepository.count({ where: { status: UserStatus.INATIVO } })
    ]);

    return { ativos, inativos };
  }

  /**
   * 🔧 Contar usuários por permissão (CORRIGIDO COM ENUM)
   */
  async countByPermission(): Promise<Record<string, number>> {
    const permissions = [
      UserPermission.VISITANTE,
      UserPermission.USUARIO,
      UserPermission.OPERADOR,
      UserPermission.ADMINISTRADOR,
      UserPermission.DESENVOLVEDOR
    ];
    
    const counts: Record<string, number> = {};

    for (const permission of permissions) {
      counts[permission] = await this.usersRepository.count({
        where: { permissao: permission }
      });
    }

    return counts;
  }

  /**
   * 🆕 Contar usuários por função
   */
  async countByRole(): Promise<Record<string, number>> {
    const roles = [
      UserRole.ESTAGIARIO,
      UserRole.GESTOR,
      UserRole.ANALISTA,
      UserRole.COORDENADOR,
      UserRole.DIRETOR
    ];
    
    const counts: Record<string, number> = {};

    for (const role of roles) {
      counts[this.userRoleToString(role)] = await this.usersRepository.count({
        where: { funcao: role }
      });
    }

    return counts;
  }

  /**
   * 🔧 Alterar permissão do usuário (CORRIGIDO COM ENUM)
   */
  async changePermission(id: number, novaPermissao: UserPermission): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const permissoesValidas = [
      UserPermission.VISITANTE,
      UserPermission.USUARIO,
      UserPermission.OPERADOR,
      UserPermission.ADMINISTRADOR,
      UserPermission.DESENVOLVEDOR
    ];
    
    if (!permissoesValidas.includes(novaPermissao)) {
      throw new Error('Permissão inválida');
    }

    await this.usersRepository.update(id, {
      permissao: novaPermissao,
    });

    return this.findById(id);
  }

  /**
   * 🆕 Versão de changePermission que aceita string
   */
  async changePermissionByString(id: number, novaPermissao: string): Promise<User> {
    const permissionEnum = this.stringToUserPermission(novaPermissao);
    return this.changePermission(id, permissionEnum);
  }

  /**
   * 🆕 Alterar função do usuário
   */
  async changeRole(id: number, novaFuncao: UserRole): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const funcoesValidas = [
      UserRole.ESTAGIARIO,
      UserRole.GESTOR,
      UserRole.ANALISTA,
      UserRole.COORDENADOR,
      UserRole.DIRETOR
    ];
    
    if (!funcoesValidas.includes(novaFuncao)) {
      throw new Error('Função inválida');
    }

    await this.usersRepository.update(id, {
      funcao: novaFuncao,
    });

    return this.findById(id);
  }

  /**
   * 🆕 Versão de changeRole que aceita string
   */
  async changeRoleByString(id: number, novaFuncao: string): Promise<User> {
    const roleEnum = this.stringToUserRole(novaFuncao);
    return this.changeRole(id, roleEnum);
  }

  /**
   * Verificar se usuário tem permissão específica
   */
  async hasPermission(userId: number, requiredPermission: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    const permissions = [
      UserPermission.VISITANTE,
      UserPermission.USUARIO,
      UserPermission.OPERADOR,
      UserPermission.ADMINISTRADOR,
      UserPermission.DESENVOLVEDOR
    ];
    
    const userLevel = permissions.indexOf(user.permissao);
    const requiredLevel = permissions.indexOf(this.stringToUserPermission(requiredPermission));

    return userLevel >= requiredLevel;
  }

  /**
   * Verificar se é primeiro usuário do sistema
   */
  async isFirstUser(): Promise<boolean> {
    const count = await this.getUserCount();
    return count === 0;
  }

  /**
   * 🔧 Obter estatísticas gerais dos usuários (ATUALIZADO)
   */
  async getStatistics(): Promise<any> {
    const [total, byStatus, byPermission, byRole] = await Promise.all([
      this.getUserCount(),
      this.countByStatus(),
      this.countByPermission(),
      this.countByRole()
    ]);

    return {
      total,
      ativos: byStatus.ativos,
      inativos: byStatus.inativos,
      porPermissao: byPermission,
      porFuncao: byRole,
      percentualAtivos: total > 0 ? ((byStatus.ativos / total) * 100).toFixed(1) : 0
    };
  }

  /**
   * Buscar usuários com login recente (últimos X dias)
   */
  async findRecentlyActive(days: number = 30): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.ultimo_login >= :cutoffDate', { cutoffDate })
      .select(['user.id', 'user.nome_usuario', 'user.funcao', 'user.permissao', 'user.email', 'user.ultimo_login'])
      .getMany();
  }

  /**
   * 🔧 Remover usuário permanentemente (CORRIGIDO COM ENUM)
   */
  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Não permitir remover o último desenvolvedor
    if (user.permissao === UserPermission.DESENVOLVEDOR) {
      const devCount = await this.usersRepository.count({
        where: { 
          permissao: UserPermission.DESENVOLVEDOR, 
          status: UserStatus.ATIVO 
        }
      });

      if (devCount <= 1) {
        throw new Error('Não é possível remover o último desenvolvedor do sistema');
      }
    }

    await this.usersRepository.remove(user);
  }

  /**
   * Validar senha do usuário
   */
  async validatePassword(userId: number, password: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['senha']
    });

    if (!user) {
      return false;
    }

    return argon2.verify(user.senha, password);
  }

  /**
   * Alterar senha do usuário
   */
  async changePassword(userId: number, newPassword: string): Promise<void> {
    const hashedPassword = await argon2.hash(newPassword);
    
    await this.usersRepository.update(userId, {
      senha: hashedPassword
    });
  }

  // ===============================================
  // 🔧 FUNÇÕES AUXILIARES PARA CONVERSÃO DE TIPOS
  // ===============================================

  /**
   * 🔧 Converter string para UserPermission enum
   */
  private stringToUserPermission(permission: string): UserPermission {
    switch (permission) {
      case 'Visitante':
        return UserPermission.VISITANTE;
      case 'Usuario':
        return UserPermission.USUARIO;
      case 'Operador':
        return UserPermission.OPERADOR;
      case 'Administrador':
        return UserPermission.ADMINISTRADOR;
      case 'Desenvolvedor':
        return UserPermission.DESENVOLVEDOR;
      default:
        return UserPermission.VISITANTE;
    }
  }

  /**
   * 🔧 Converter string para UserRole enum (ATUALIZADO COM FUNÇÕES CORRETAS)
   */
  private stringToUserRole(role: string): UserRole {
    const roleNormalized = role.trim();
    
    switch (roleNormalized) {
      case 'Estagiario':
      case 'Estagiário':
      case 'Intern':
        return UserRole.ESTAGIARIO;
      case 'Gestor':
      case 'Manager':
        return UserRole.GESTOR;
      case 'Analista':
      case 'Analyst':
        return UserRole.ANALISTA;
      case 'Coordenador':
      case 'Coordinator':
        return UserRole.COORDENADOR;
      case 'Diretor':
      case 'Director':
        return UserRole.DIRETOR;
      default:
        return UserRole.ESTAGIARIO; // Padrão para estagiário
    }
  }

  /**
   * 🆕 Converter UserPermission enum para string
   */
  public userPermissionToString(permission: UserPermission): string {
    switch (permission) {
      case UserPermission.VISITANTE:
        return 'Visitante';
      case UserPermission.USUARIO:
        return 'Usuario';
      case UserPermission.OPERADOR:
        return 'Operador';
      case UserPermission.ADMINISTRADOR:
        return 'Administrador';
      case UserPermission.DESENVOLVEDOR:
        return 'Desenvolvedor';
      default:
        return 'Visitante';
    }
  }

  /**
   * 🔧 Converter UserRole enum para string (ATUALIZADO COM FUNÇÕES CORRETAS)
   */
  public userRoleToString(role: UserRole): string {
    switch (role) {
      case UserRole.ESTAGIARIO:
        return 'Estagiario';
      case UserRole.GESTOR:
        return 'Gestor';
      case UserRole.ANALISTA:
        return 'Analista';
      case UserRole.COORDENADOR:
        return 'Coordenador';
      case UserRole.DIRETOR:
        return 'Diretor';
      default:
        return 'Estagiario';
    }
  }

  // ===============================================
  // 🆕 MÉTODOS AUXILIARES PARA FUNÇÕES
  // ===============================================

  /**
   * 🆕 Listar funções disponíveis
   */
  public getAvailableRoles(): string[] {
    return ['Estagiario', 'Gestor', 'Analista', 'Coordenador', 'Diretor'];
  }

  /**
   * 🆕 Validar se função é válida
   */
  public isValidRole(role: string): boolean {
    return this.getAvailableRoles().includes(role);
  }

  /**
   * 🆕 Listar permissões disponíveis
   */
  public getAvailablePermissions(): string[] {
    return ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
  }

  /**
   * 🆕 Validar se permissão é válida
   */
  public isValidPermission(permission: string): boolean {
    return this.getAvailablePermissions().includes(permission);
  }
}