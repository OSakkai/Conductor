import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum ChaveTipo {
  PERMANENT = 'permanent',
  EXPIRING = 'expiring',
  SINGLE_USE = 'single_use',
}

export enum ChavePermissao {
  USUARIO = 'Usuario',
  OPERADOR = 'Operador',
  ADMINISTRADOR = 'Administrador',
  DESENVOLVEDOR = 'Desenvolvedor',
}

export enum ChaveStatus {
  ATIVA = 'ativa',
  INATIVA = 'inativa',
  USADA = 'usada',
  EXPIRADA = 'expirada',
}

@Entity('chaves_acesso')
export class Chave {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  chave: string;

  @Column({
    type: 'enum',
    enum: ChaveTipo,
  })
  tipo: ChaveTipo;

  @Column({
    type: 'enum',
    enum: ChavePermissao,
  })
  permissao: ChavePermissao;

  @CreateDateColumn()
  data_criacao: Date;

  @Column({ nullable: true })
  data_expiracao: Date;

  @Column({ default: 0 })
  usos_atual: number;

  @Column({ nullable: true })
  usos_maximo: number;

  @Column({
    type: 'enum',
    enum: ChaveStatus,
    default: ChaveStatus.ATIVA,
  })
  status: ChaveStatus;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ length: 50, nullable: true })
  criado_por: string;
}