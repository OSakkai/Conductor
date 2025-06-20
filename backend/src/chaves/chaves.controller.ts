// ===============================================
// CONDUCTOR - CHAVES CONTROLLER COMPLETO
// backend/src/chaves/chaves.controller.ts
// ===============================================

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  UseGuards,
  ParseIntPipe 
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';

@Controller('chaves')
@UseGuards(JwtAuthGuard)
export class ChavesController {
  constructor(private readonly chavesService: ChavesService) {}

  // ===============================================
  // ENDPOINTS BÁSICOS DE CRUD
  // ===============================================

  /**
   * Listar todas as chaves
   */
  @Get()
  async findAll() {
    try {
      const chaves = await this.chavesService.findAll();
      return {
        success: true,
        data: chaves,
        message: 'Chaves carregadas com sucesso'
      };
    } catch (error) {
      console.error('Erro ao listar chaves:', error);
      return {
        success: false,
        message: 'Erro ao carregar chaves: ' + error.message
      };
    }
  }

  /**
   * Buscar chave por ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      const chave = await this.chavesService.findOne(id);
      return {
        success: true,
        data: chave,
        message: 'Chave encontrada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao buscar chave:', error);
      return {
        success: false,
        message: 'Erro ao buscar chave: ' + error.message
      };
    }
  }

  /**
   * Criar nova chave
   */
  @Post()
  async create(@Body() createChaveDto: any) {
    try {
      const chave = await this.chavesService.create(createChaveDto);
      return {
        success: true,
        data: chave,
        message: 'Chave criada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao criar chave:', error);
      return {
        success: false,
        message: 'Erro ao criar chave: ' + error.message
      };
    }
  }

  /**
   * Atualizar chave
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateChaveDto: any
  ) {
    try {
      const chave = await this.chavesService.update(id, updateChaveDto);
      return {
        success: true,
        data: chave,
        message: 'Chave atualizada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao atualizar chave:', error);
      return {
        success: false,
        message: 'Erro ao atualizar chave: ' + error.message
      };
    }
  }

  /**
   * Excluir chave permanentemente
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.chavesService.remove(id);
      return {
        success: true,
        message: 'Chave excluída com sucesso'
      };
    } catch (error) {
      console.error('Erro ao excluir chave:', error);
      return {
        success: false,
        message: 'Erro ao excluir chave: ' + error.message
      };
    }
  }

  // ===============================================
  // NOVOS ENDPOINTS PARA SISTEMA DE EXPIRAÇÃO
  // ===============================================

  /**
   * 🆕 Obter estatísticas detalhadas das chaves
   */
  @Get('statistics')
  async getStatistics() {
    try {
      const stats = await this.chavesService.getStatistics();
      return {
        success: true,
        data: stats,
        message: 'Estatísticas carregadas com sucesso'
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        success: false,
        message: 'Erro ao obter estatísticas: ' + error.message
      };
    }
  }

  /**
   * 🆕 Verificar status de todas as chaves manualmente
   */
  @Get('check-status')
  async checkAllStatus() {
    try {
      const result = await this.chavesService.checkAllKeysStatus();
      return {
        success: true,
        message: `Verificação concluída: ${result.updated} chaves atualizadas`,
        data: result
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return {
        success: false,
        message: 'Erro ao verificar status: ' + error.message
      };
    }
  }

  /**
   * 🆕 Validar chave de acesso (para uso no registro)
   */
  @Post('validate')
  async validateKey(@Body() body: { chave: string }) {
    try {
      if (!body.chave) {
        return {
          success: false,
          message: 'Código da chave é obrigatório'
        };
      }

      const result = await this.chavesService.validateAndUseKey(body.chave);
      return {
        success: result.isValid,
        message: result.message,
        permission: result.permission
      };
    } catch (error) {
      console.error('Erro ao validar chave:', error);
      return {
        success: false,
        message: 'Erro ao validar chave: ' + error.message
      };
    }
  }

  /**
   * 🆕 Desativar chave
   */
  @Put(':id/deactivate')
  async deactivateKey(@Param('id', ParseIntPipe) id: number) {
    try {
      const chave = await this.chavesService.deactivate(id);
      return {
        success: true,
        data: chave,
        message: 'Chave desativada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao desativar chave:', error);
      return {
        success: false,
        message: 'Erro ao desativar chave: ' + error.message
      };
    }
  }

  /**
   * 🆕 Reativar chave
   */
  @Put(':id/reactivate')
  async reactivateKey(@Param('id', ParseIntPipe) id: number) {
    try {
      const chave = await this.chavesService.reactivate(id);
      return {
        success: true,
        data: chave,
        message: 'Chave reativada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao reativar chave:', error);
      return {
        success: false,
        message: 'Erro ao reativar chave: ' + error.message
      };
    }
  }

  /**
   * 🆕 Buscar chaves expirando em X horas
   */
  @Get('expiring/:hours')
  async findExpiringIn(@Param('hours', ParseIntPipe) hours: number) {
    try {
      const chaves = await this.chavesService.findExpiringIn(hours);
      return {
        success: true,
        data: chaves,
        message: `Encontradas ${chaves.length} chaves expirando em ${hours} horas`
      };
    } catch (error) {
      console.error('Erro ao buscar chaves expirando:', error);
      return {
        success: false,
        message: 'Erro ao buscar chaves expirando: ' + error.message
      };
    }
  }

  /**
   * 🆕 Contar chaves por status
   */
  @Get('count/by-status')
  async countByStatus() {
    try {
      const counts = await this.chavesService.countByStatus();
      return {
        success: true,
        data: counts,
        message: 'Contagem por status obtida com sucesso'
      };
    } catch (error) {
      console.error('Erro ao contar por status:', error);
      return {
        success: false,
        message: 'Erro ao contar por status: ' + error.message
      };
    }
  }

  /**
   * 🆕 Buscar chave por código
   */
  @Get('code/:chaveCode')
  async findByCode(@Param('chaveCode') chaveCode: string) {
    try {
      const chave = await this.chavesService.findByCode(chaveCode);
      
      if (!chave) {
        return {
          success: false,
          message: 'Chave não encontrada'
        };
      }

      return {
        success: true,
        data: chave,
        message: 'Chave encontrada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao buscar chave por código:', error);
      return {
        success: false,
        message: 'Erro ao buscar chave: ' + error.message
      };
    }
  }

  /**
   * 🆕 Limpeza de chaves antigas
   */
  @Delete('cleanup/:days')
  async cleanupOldKeys(@Param('days', ParseIntPipe) days: number) {
    try {
      const removedCount = await this.chavesService.cleanupOldKeys(days);
      return {
        success: true,
        message: `${removedCount} chaves antigas foram removidas`,
        data: { removedCount }
      };
    } catch (error) {
      console.error('Erro na limpeza:', error);
      return {
        success: false,
        message: 'Erro na limpeza: ' + error.message
      };
    }
  }

  // ===============================================
  // ENDPOINTS PARA RELATÓRIOS E MONITORAMENTO
  // ===============================================

  /**
   * 🆕 Relatório completo de chaves
   */
  @Get('reports/full')
  async getFullReport() {
    try {
      const [chaves, stats, expiring24h] = await Promise.all([
        this.chavesService.findAll(),
        this.chavesService.getStatistics(),
        this.chavesService.findExpiringIn(24)
      ]);

      return {
        success: true,
        data: {
          chaves,
          estatisticas: stats,
          expirandoEm24h: expiring24h,
          geradoEm: new Date().toISOString()
        },
        message: 'Relatório completo gerado com sucesso'
      };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return {
        success: false,
        message: 'Erro ao gerar relatório: ' + error.message
      };
    }
  }

  /**
   * 🆕 Health check do sistema de chaves
   */
  @Get('health')
  async healthCheck() {
    try {
      const [totalChaves, stats] = await Promise.all([
        this.chavesService.findAll(),
        this.chavesService.getStatistics()
      ]);

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        totalChaves: totalChaves.length,
        chavesAtivas: stats.ativas,
        chavesProblematicas: stats.expiradas + stats.usadas,
        sistemaFuncionando: true
      };

      return {
        success: true,
        data: health,
        message: 'Sistema de chaves funcionando normalmente'
      };
    } catch (error) {
      console.error('Erro no health check:', error);
      return {
        success: false,
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message,
          sistemaFuncionando: false
        },
        message: 'Erro no health check: ' + error.message
      };
    }
  }
}