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

@Entity('usuarios')
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
    default: UserPermission.VISITANTE,
  })
  permissao: UserPermission;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ nullable: true, length: 20 })
  celular: string;

  @Column({ length: 255 })
  senha: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ATIVO,
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
}