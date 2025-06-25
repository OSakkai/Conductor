// ===============================================
// CONDUCTOR - CHAVES CONTROLLER CORRIGIDO
// backend/src/chaves/chaves.controller.ts
// CORREÇÃO CRÍTICA: Endpoint /validate público
// ===============================================

import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';

@Controller('chaves')
// ❌ REMOVIDO: @UseGuards(JwtAuthGuard) - Guard será aplicado individualmente
export class ChavesController {
  constructor(private readonly chavesService: ChavesService) {}

  // ===============================================
  // ENDPOINTS PROTEGIDOS (requerem autenticação)
  // ===============================================

  @Get()
  @UseGuards(JwtAuthGuard) // ✅ Guard aplicado individualmente
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
  @UseGuards(JwtAuthGuard) // ✅ Guard aplicado individualmente
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

  @Get(':id')
  @UseGuards(JwtAuthGuard) // ✅ Guard aplicado individualmente
  async findOne(@Param('id') id: number) {
    try {
      const chave = await this.chavesService.findById(id);
      
      if (!chave) {
        return {
          success: false,
          message: 'Chave não encontrada',
        };
      }

      return {
        success: true,
        data: chave,
        message: 'Chave encontrada',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao buscar chave',
        error: error.message,
      };
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard) // ✅ Guard aplicado individualmente
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

  @Delete(':id')
  @UseGuards(JwtAuthGuard) // ✅ Guard aplicado individualmente
  async remove(@Param('id') id: number) {
    try {
      await this.chavesService.remove(id);
      return {
        success: true,
        message: 'Chave removida com sucesso',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao remover chave',
        error: error.message,
      };
    }
  }

  @Put(':id/deactivate')
  @UseGuards(JwtAuthGuard) // ✅ Guard aplicado individualmente
  async deactivate(@Param('id') id: number) {
    try {
      await this.chavesService.deactivate(id);
      return {
        success: true,
        message: 'Chave desativada com sucesso',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao desativar chave',
        error: error.message,
      };
    }
  }

  @Get('stats/summary')
  @UseGuards(JwtAuthGuard) // ✅ Guard aplicado individualmente
  async getStats() {
    try {
      const chaves = await this.chavesService.findAll();
      
      const stats = {
        total: chaves.length,
        ativas: chaves.filter(c => c.status === 'ativa').length,
        inativas: chaves.filter(c => c.status === 'inativa').length,
        expiradas: chaves.filter(c => c.status === 'expirada').length,
        usadas: chaves.filter(c => c.status === 'usada').length,
      };

      return {
        success: true,
        data: stats,
        message: 'Estatísticas carregadas',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao carregar estatísticas',
        error: error.message,
      };
    }
  }

  // ===============================================
  // ENDPOINT PÚBLICO (NÃO requer autenticação)
  // ===============================================

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  // ✅ CORREÇÃO CRÍTICA: SEM @UseGuards() - Endpoint público conforme DOC 2
  async validateKey(@Body() body: { chave: string }) {
    try {
      console.log('🔑 [VALIDATE] Validando chave:', body.chave);
      
      if (!body || !body.chave || typeof body.chave !== 'string' || !body.chave.trim()) {
        console.log('❌ [VALIDATE] Chave não fornecida ou inválida');
        return {
          success: false,
          isValid: false,
          message: 'Chave não fornecida ou formato inválido',
        };
      }

      if (!this.chavesService || typeof this.chavesService.validateKey !== 'function') {
        console.error('❌ [VALIDATE] ChavesService não disponível');
        return {
          success: false,
          isValid: false,
          message: 'Serviço de validação temporariamente indisponível',
        };
      }

      const result = await this.chavesService.validateKey(body.chave.trim());
      
      console.log('🔑 [VALIDATE] Resultado:', result);
      
      if (!result || typeof result !== 'object') {
        console.error('❌ [VALIDATE] Resposta inválida do ChavesService');
        return {
          success: false,
          isValid: false,
          message: 'Erro interno na validação',
        };
      }
      
      return {
        success: true,
        isValid: result.isValid || false,
        permission: result.permission || null,
        message: result.message || 'Validação concluída',
      };
    } catch (error) {
      console.error('❌ [VALIDATE] Erro na validação:', error);
      return {
        success: false,
        isValid: false,
        message: 'Erro interno na validação da chave',
      };
    }
  }
}