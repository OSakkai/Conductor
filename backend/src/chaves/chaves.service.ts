import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chave, ChaveStatus } from './chave.entity';

@Injectable()
export class ChavesService {
  constructor(
    @InjectRepository(Chave)
    private chavesRepository: Repository<Chave>,
  ) {}

  async findAll(): Promise<Chave[]> {
    return this.chavesRepository.find({
      order: { data_criacao: 'DESC' },
    });
  }

  async create(chaveData: Partial<Chave>): Promise<Chave> {
    const chave = this.chavesRepository.create(chaveData);
    return this.chavesRepository.save(chave);
  }

  async update(id: number, updateData: Partial<Chave>): Promise<Chave> {
    await this.chavesRepository.update(id, updateData);
    return this.chavesRepository.findOne({ where: { id } });
  }

  async findById(id: number): Promise<Chave> {
    return this.chavesRepository.findOne({ where: { id } });
  }

  async deactivate(id: number): Promise<void> {
    await this.chavesRepository.update(id, {
      status: ChaveStatus.INATIVA,
    });
  }
}