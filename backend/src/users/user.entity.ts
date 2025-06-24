import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  ESTAGIARIO = 'Estagiario',
  GESTOR = 'Gestor',
  ANALISTA = 'Analista',
  COORDENADOR = 'Coordenador',
  DIRETOR = 'Diretor',
}

export enum UserPermission {
  VISITANTE = 'Visitante',
  USUARIO = 'Usuario',
  OPERADOR = 'Operador',
  ADMINISTRADOR = 'Administrador',
  DESENVOLVEDOR = 'Desenvolvedor',
}

export enum UserStatus {
  ATIVO = 'Ativo',
  INATIVO = 'Inativo',
  BLOQUEADO = 'Bloqueado',
}

@Entity('usuarios') // ✅ CORREÇÃO DEFINITIVA: Schema SQL real usa 'usuarios' sem acento
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  nome_usuario: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  funcao: UserRole;

  @Column({
    type: 'enum',
    enum: UserPermission,
    default: UserPermission.VISITANTE, // ✅ FASE 1: Default corrigido
  })
  permissao: UserPermission;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ nullable: true, length: 20 })
  celular: string; // ✅ FASE 2: Campo padronizado

  @Column({ length: 255 })
  senha: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ATIVO, // ✅ FASE 1: Default corrigido
  })
  status: UserStatus;

  @CreateDateColumn()
  data_criacao: Date;

  @UpdateDateColumn()
  data_atualizacao: Date;

  @Column({ nullable: true })
  ultimo_login: Date;

  @Column({ nullable: true, length: 255 })
  token_recuperacao: string;

  @Column({ nullable: true })
  token_expiracao: Date;

  // ✅ FASE 3: Métodos de segurança adicionados
  updateLastLogin() {
    this.ultimo_login = new Date();
  }

  // ✅ FASE 3: Método para invalidar tokens de recuperação
  clearRecoveryToken() {
    this.token_recuperacao = null;
    this.token_expiracao = null;
  }

  // ✅ FASE 4: Método para verificar se conta está ativa
  isActive(): boolean {
    return this.status === UserStatus.ATIVO;
  }
}