import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';

@Controller('chaves')
@UseGuards(JwtAuthGuard)
export class ChavesController {
  constructor(private readonly chavesService: ChavesService) {}

  @Get()
  async findAll() {
    try {
      const chaves = await this.chavesService.findAll();
      return {
        success: true,
        data: chaves,
        message: 'Chaves carregadas com sucesso',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao carregar chaves',
        error: error.message,
      };
    }
  }

  @Post()
  async create(@Body() chaveData: Partial<Chave>) {
    try {
      const chave = await this.chavesService.create(chaveData);
      return {
        success: true,
        data: chave,
        message: 'Chave criada com sucesso',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao criar chave',
        error: error.message,
      };
    }
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() updateData: Partial<Chave>) {
    try {
      const chave = await this.chavesService.update(id, updateData);
      return {
        success: true,
        data: chave,
        message: 'Chave atualizada com sucesso',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao atualizar chave',
        error: error.message,
      };
    }
  }
}