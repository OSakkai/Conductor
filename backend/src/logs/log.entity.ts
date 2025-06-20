import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('logs_sistema')
export class LogSistema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  usuario_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuario_id' })
  usuario: User;

  @Column({ length: 100 })
  acao: string;

  @Column({ type: 'text', nullable: true })
  detalhes: string;

  @Column({ length: 45, nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @CreateDateColumn()
  data_criacao: Date;
}