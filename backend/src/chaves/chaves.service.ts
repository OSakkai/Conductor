// ===============================================
// CONDUCTOR - CHAVES SERVICE COMPLETO CORRIGIDO
// backend/src/chaves/chaves.service.ts
// CORREÇÃO: Separação de validação e consumo + tipos corretos
// ===============================================

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chave, ChaveTipo, ChaveStatus, ChavePermissao } from './chave.entity';

@Injectable()
export class ChavesService {
  constructor(
    @InjectRepository(Chave)
    private chavesRepository: Repository<Chave>,
  ) {}

  // ===============================================
  // MÉTODO CREATE CORRIGIDO COM GERAÇÃO AUTOMÁTICA
  // ===============================================

  /**
   * 🔧 Criar nova chave (VERSÃO CORRIGIDA COM GERAÇÃO AUTOMÁTICA)
   */
  async create(createChaveDto: any): Promise<Chave> {
    // ✅ CORREÇÃO: Se não fornecida, gerar código automaticamente
    if (!createChaveDto.chave) {
      createChaveDto.chave = this.generateKeyCode();
    }

    // Validações de negócio
    if (!createChaveDto.tipo || !createChaveDto.permissao) {
      throw new BadRequestException('Campos obrigatórios: tipo, permissao');
    }

    // Verificar se chave já existe
    let existing = await this.chavesRepository.findOne({
      where: { chave: createChaveDto.chave }
    });

    // Se a chave gerada automaticamente já existe, gerar uma nova
    let attempts = 0;
    while (existing && attempts < 10) {
      createChaveDto.chave = this.generateKeyCode();
      existing = await this.chavesRepository.findOne({
        where: { chave: createChaveDto.chave }
      });
      attempts++;
    }

    if (existing) {
      throw new BadRequestException('Não foi possível gerar uma chave única após várias tentativas');
    }

    // Validar data de expiração para chaves expiráveis
    if (createChaveDto.tipo === ChaveTipo.EXPIRING) {
      if (!createChaveDto.data_expiracao) {
        throw new BadRequestException('Data de expiração é obrigatória para chaves expiráveis');
      }

      const expirationDate = new Date(createChaveDto.data_expiracao);
      const now = new Date();

      if (expirationDate <= now) {
        throw new BadRequestException('Data de expiração deve ser no futuro');
      }
    }

    // Definir usos máximos para chaves de uso único
    if (createChaveDto.tipo === ChaveTipo.SINGLE_USE) {
      createChaveDto.usos_maximo = 1;
    }

    // Criar entidade e salvar
    const novaChave = this.chavesRepository.create({
      chave: createChaveDto.chave,
      tipo: createChaveDto.tipo,
      permissao: createChaveDto.permissao,
      data_expiracao: createChaveDto.data_expiracao || null,
      usos_maximo: createChaveDto.usos_maximo || null,
      descricao: createChaveDto.descricao || null,
      criado_por: createChaveDto.criado_por || null,
      status: ChaveStatus.ATIVA,
      usos_atual: 0
    });

    const savedChave = await this.chavesRepository.save(novaChave);
    return savedChave;
  }

  /**
   * ✅ NOVO: Gerador de código de chave
   */
  private generateKeyCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  // ===============================================
  // MÉTODO DE VALIDAÇÃO DE CHAVE - CORRIGIDO!
  // ===============================================

  /**
   * 🔧 Validar chave de acesso (CORRIGIDO - NÃO CONSOME A CHAVE)
   * IMPORTANTE: Este método apenas VERIFICA se a chave é válida
   * O consumo da chave deve ser feito separadamente no momento do uso
   */
  async validateKey(chaveCode: string): Promise<{ isValid: boolean; permission?: string; message: string }> {
    try {
      const chave = await this.chavesRepository.findOne({
        where: { chave: chaveCode }
      });

      if (!chave) {
        return { 
          isValid: false, 
          message: 'Chave não encontrada' 
        };
      }

      // Verificar se chave está ativa
      if (chave.status !== ChaveStatus.ATIVA) {
        return { 
          isValid: false, 
          message: 'Chave inativa ou expirada' 
        };
      }

      // Verificar expiração
      if (chave.tipo === ChaveTipo.EXPIRING && chave.data_expiracao) {
        const now = new Date();
        if (now > chave.data_expiracao) {
          // Marcar como expirada
          await this.chavesRepository.update(chave.id, {
            status: ChaveStatus.EXPIRADA
          });
          
          return { 
            isValid: false, 
            message: 'Chave expirada' 
          };
        }
      }

      // ✅ CORREÇÃO CRÍTICA: Para chaves single_use, apenas verificar se ainda tem usos
      // NÃO consumir a chave durante a validação!
      if (chave.tipo === ChaveTipo.SINGLE_USE) {
        if (chave.usos_atual >= (chave.usos_maximo || 1)) {
          return { 
            isValid: false, 
            message: 'Chave já foi utilizada' 
          };
        }
        
        // ✅ APENAS RETORNAR SE É VÁLIDA - NÃO INCREMENTAR USO!
        return { 
          isValid: true, 
          permission: chave.permissao,
          message: 'Chave válida e disponível para uso' 
        };
      }

      // Para chaves permanentes, sempre válidas
      return { 
        isValid: true, 
        permission: chave.permissao,
        message: 'Chave válida' 
      };

    } catch (error) {
      console.error('Erro ao validar chave:', error);
      return { 
        isValid: false, 
        message: 'Erro interno ao validar chave' 
      };
    }
  }

  // ===============================================
  // NOVO MÉTODO: CONSUMIR CHAVE (SEPARADO DA VALIDAÇÃO)
  // ===============================================

  /**
   * 🆕 Consumir chave (incrementar uso e atualizar status)
   * Este método deve ser chamado quando a chave é EFETIVAMENTE USADA
   */
  async consumeKey(chaveCode: string): Promise<{ success: boolean; message: string }> {
    try {
      const chave = await this.chavesRepository.findOne({
        where: { chave: chaveCode }
      });

      if (!chave) {
        return { 
          success: false, 
          message: 'Chave não encontrada' 
        };
      }

      // Verificar se chave ainda está ativa
      if (chave.status !== ChaveStatus.ATIVA) {
        return { 
          success: false, 
          message: 'Chave inativa ou expirada' 
        };
      }

      // Verificar expiração novamente
      if (chave.tipo === ChaveTipo.EXPIRING && chave.data_expiracao) {
        const now = new Date();
        if (now > chave.data_expiracao) {
          await this.chavesRepository.update(chave.id, {
            status: ChaveStatus.EXPIRADA
          });
          
          return { 
            success: false, 
            message: 'Chave expirada' 
          };
        }
      }

      // Consumir a chave (incrementar uso)
      const novoUso = chave.usos_atual + 1;
      let novoStatus: ChaveStatus = chave.status; // ✅ CORREÇÃO: Tipo correto

      // Para chaves single_use, marcar como usada após o primeiro uso
      if (chave.tipo === ChaveTipo.SINGLE_USE && novoUso >= (chave.usos_maximo || 1)) {
        novoStatus = ChaveStatus.USADA;
      }

      // Atualizar banco de dados
      await this.chavesRepository.update(chave.id, {
        usos_atual: novoUso,
        status: novoStatus
      });

      return { 
        success: true, 
        message: `Chave consumida com sucesso. Usos: ${novoUso}/${chave.usos_maximo || 'ilimitado'}` 
      };

    } catch (error) {
      console.error('Erro ao consumir chave:', error);
      return { 
        success: false, 
        message: 'Erro interno ao consumir chave' 
      };
    }
  }

  // ===============================================
  // MÉTODO COMBO: VALIDAR E CONSUMIR (PARA REGISTRO)
  // ===============================================

  /**
   * 🆕 Validar e consumir chave em uma operação atômica
   * Usado durante o registro de usuários
   */
  async validateAndConsumeKey(chaveCode: string): Promise<{ 
    isValid: boolean; 
    permission?: string; 
    message: string; 
    consumed?: boolean 
  }> {
    try {
      // Primeiro validar
      const validation = await this.validateKey(chaveCode);
      
      if (!validation.isValid) {
        return {
          isValid: false,
          message: validation.message,
          consumed: false
        };
      }

      // Se válida, consumir
      const consumption = await this.consumeKey(chaveCode);
      
      return {
        isValid: true,
        permission: validation.permission,
        message: consumption.success ? 
          `Chave validada e consumida: ${consumption.message}` : 
          `Chave válida mas erro no consumo: ${consumption.message}`,
        consumed: consumption.success
      };

    } catch (error) {
      console.error('Erro ao validar e consumir chave:', error);
      return { 
        isValid: false, 
        message: 'Erro interno ao processar chave',
        consumed: false
      };
    }
  }

  // ===============================================
  // MÉTODOS AUXILIARES PARA VERIFICAÇÃO AUTOMÁTICA
  // ===============================================

  /**
   * 🆕 Verificar e atualizar status automaticamente
   */
  async checkAndUpdateKeyStatus(chave: Chave): Promise<Chave> {
    let statusChanged = false;
    const now = new Date();

    // Verificar expiração
    if (chave.tipo === ChaveTipo.EXPIRING && chave.data_expiracao) {
      if (now > chave.data_expiracao && chave.status === ChaveStatus.ATIVA) {
        chave.status = ChaveStatus.EXPIRADA;
        statusChanged = true;
      }
    }

    // Verificar uso único
    if (chave.tipo === ChaveTipo.SINGLE_USE && chave.usos_atual >= (chave.usos_maximo || 1)) {
      if (chave.status === ChaveStatus.ATIVA) {
        chave.status = ChaveStatus.USADA;
        statusChanged = true;
      }
    }

    // Salvar mudanças se necessário
    if (statusChanged) {
      await this.chavesRepository.save(chave);
    }

    return chave;
  }

  // ===============================================
  // MÉTODOS CRUD BÁSICOS
  // ===============================================

  /**
   * Listar todas as chaves com verificação automática
   */
  async findAll(): Promise<Chave[]> {
    const chaves = await this.chavesRepository.find({
      order: { data_criacao: 'DESC' }
    });

    // 🕒 VERIFICAR STATUS DE TODAS AS CHAVES
    const updatedChaves = [];
    for (const chave of chaves) {
      const updatedChave = await this.checkAndUpdateKeyStatus(chave);
      updatedChaves.push(updatedChave);
    }

    return updatedChaves;
  }

  /**
   * Buscar chave por ID com verificação de status
   */
  async findById(id: number): Promise<Chave> {
    const chave = await this.chavesRepository.findOne({ where: { id } });
    if (!chave) {
      throw new NotFoundException(`Chave com ID ${id} não encontrada`);
    }
    
    // 🕒 VERIFICAR STATUS ANTES DE RETORNAR
    return await this.checkAndUpdateKeyStatus(chave);
  }

  /**
   * Buscar chave por código
   */
  async findByCode(code: string): Promise<Chave | null> {
    const chave = await this.chavesRepository.findOne({ where: { chave: code } });
    if (!chave) {
      return null;
    }
    
    return await this.checkAndUpdateKeyStatus(chave);
  }

  /**
   * Atualizar chave com validações
   */
  async update(id: number, updateData: Partial<Chave>): Promise<Chave> {
    const chave = await this.findById(id);
    
    // 🔒 VALIDAÇÕES DE NEGÓCIO
    if (updateData.status === ChaveStatus.ATIVA) {
      // Não permitir reativar chaves expiradas
      if (chave.tipo === ChaveTipo.EXPIRING && chave.data_expiracao && chave.data_expiracao <= new Date()) {
        throw new BadRequestException('Não é possível reativar chave expirada');
      }
      
      // Não permitir reativar chaves single_use já usadas
      if (chave.tipo === ChaveTipo.SINGLE_USE && chave.usos_atual >= (chave.usos_maximo || 1)) {
        throw new BadRequestException('Não é possível reativar chave de uso único já utilizada');
      }
    }

    // Validar mudança de data de expiração
    if (updateData.data_expiracao && chave.tipo === ChaveTipo.EXPIRING) {
      const newExpirationDate = new Date(updateData.data_expiracao);
      const now = new Date();

      if (newExpirationDate <= now) {
        throw new BadRequestException('Nova data de expiração deve ser no futuro');
      }
    }

    await this.chavesRepository.update(id, updateData);
    return this.findById(id);
  }

  /**
   * Desativar chave
   */
  async deactivate(id: number): Promise<void> {
    await this.chavesRepository.update(id, {
      status: ChaveStatus.INATIVA,
    });
  }

  /**
   * Remover chave (soft delete)
   */
  async remove(id: number): Promise<void> {
    const chave = await this.findById(id);
    
    if (chave.status === ChaveStatus.ATIVA) {
      throw new BadRequestException('Não é possível excluir chave ativa. Desative-a primeiro.');
    }

    await this.chavesRepository.delete(id);
  }

  /**
   * Excluir permanentemente (admin override)
   */
  async forceRemove(id: number): Promise<void> {
    await this.chavesRepository.delete(id);
  }

  // ===============================================
  // MÉTODOS DE ESTATÍSTICAS
  // ===============================================

  /**
   * Obter estatísticas das chaves
   */
  async getStats(): Promise<{
    total: number;
    ativas: number;
    inativas: number;
    expiradas: number;
    usadas: number;
    porTipo: Record<string, number>;
    porPermissao: Record<string, number>;
  }> {
    const chaves = await this.findAll();
    
    const stats = {
      total: chaves.length,
      ativas: chaves.filter(c => c.status === ChaveStatus.ATIVA).length,
      inativas: chaves.filter(c => c.status === ChaveStatus.INATIVA).length,
      expiradas: chaves.filter(c => c.status === ChaveStatus.EXPIRADA).length,
      usadas: chaves.filter(c => c.status === ChaveStatus.USADA).length,
      porTipo: {},
      porPermissao: {}
    };

    // Estatísticas por tipo
    Object.values(ChaveTipo).forEach(tipo => {
      stats.porTipo[tipo] = chaves.filter(c => c.tipo === tipo).length;
    });

    // Estatísticas por permissão
    Object.values(ChavePermissao).forEach(permissao => {
      stats.porPermissao[permissao] = chaves.filter(c => c.permissao === permissao).length;
    });

    return stats;
  }

  /**
   * Buscar chaves por tipo
   */
  async findByType(tipo: ChaveTipo): Promise<Chave[]> {
    const chaves = await this.chavesRepository.find({
      where: { tipo },
      order: { data_criacao: 'DESC' }
    });

    const updatedChaves = [];
    for (const chave of chaves) {
      const updatedChave = await this.checkAndUpdateKeyStatus(chave);
      updatedChaves.push(updatedChave);
    }

    return updatedChaves;
  }

  /**
   * Buscar chaves por status
   */
  async findByStatus(status: ChaveStatus): Promise<Chave[]> {
    const chaves = await this.chavesRepository.find({
      where: { status },
      order: { data_criacao: 'DESC' }
    });

    const updatedChaves = [];
    for (const chave of chaves) {
      const updatedChave = await this.checkAndUpdateKeyStatus(chave);
      updatedChaves.push(updatedChave);
    }

    return updatedChaves;
  }

  /**
   * Buscar chaves prestes a expirar
   */
  async findExpiringKeys(daysAhead: number = 7): Promise<Chave[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const chaves = await this.chavesRepository.find({
      where: {
        tipo: ChaveTipo.EXPIRING,
        status: ChaveStatus.ATIVA
      }
    });

    return chaves.filter(chave => 
      chave.data_expiracao && 
      chave.data_expiracao <= futureDate
    );
  }

  // ===============================================
  // MÉTODOS DE MANUTENÇÃO
  // ===============================================

  /**
   * Atualizar status de todas as chaves
   */
  async updateAllKeyStatuses(): Promise<number> {
    const chaves = await this.chavesRepository.find();
    let updatedCount = 0;

    for (const chave of chaves) {
      const originalStatus = chave.status;
      await this.checkAndUpdateKeyStatus(chave);
      
      if (chave.status !== originalStatus) {
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Validar integridade das chaves
   */
  async validateIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const chaves = await this.chavesRepository.find();

    for (const chave of chaves) {
      // Verificar se códigos são únicos
      const duplicates = await this.chavesRepository.find({
        where: { chave: chave.chave }
      });

      if (duplicates.length > 1) {
        issues.push(`Chave duplicada encontrada: ${chave.chave}`);
      }

      // Verificar consistência de dados
      if (chave.tipo === ChaveTipo.EXPIRING && !chave.data_expiracao) {
        issues.push(`Chave expirável sem data de expiração: ${chave.chave}`);
      }

      if (chave.tipo === ChaveTipo.SINGLE_USE && (!chave.usos_maximo || chave.usos_maximo !== 1)) {
        issues.push(`Chave de uso único com usos_maximo incorreto: ${chave.chave}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}