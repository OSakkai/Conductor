import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogSistema } from './log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogSistema)
    private logsRepository: Repository<LogSistema>,
  ) {}

  async findAll(): Promise<LogSistema[]> {
    return this.logsRepository.find({
      relations: ['usuario'],
      order: { data_criacao: 'DESC' },
      take: 100, // Últimos 100 logs
    });
  }

  async create(logData: Partial<LogSistema>): Promise<LogSistema> {
    const log = this.logsRepository.create(logData);
    return this.logsRepository.save(log);
  }
}