// ===============================================
// CONDUCTOR - CHAVES SERVICE CORRIGIDO 
// backend/src/chaves/chaves.service.ts
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
  // MÉTODO CREATE CORRIGIDO
  // ===============================================

  /**
   * 🔧 Criar nova chave (VERSÃO CORRIGIDA)
   */
  async create(createChaveDto: any): Promise<Chave> {
    // Validações de negócio
    if (!createChaveDto.chave || !createChaveDto.tipo || !createChaveDto.permissao) {
      throw new BadRequestException('Campos obrigatórios: chave, tipo, permissao');
    }

    // Verificar se chave já existe
    const existing = await this.chavesRepository.findOne({
      where: { chave: createChaveDto.chave }
    });

    if (existing) {
      throw new BadRequestException('Já existe uma chave com este código');
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

    // 🔧 SOLUÇÃO: Criar entidade diretamente e salvar
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

    // 🔧 SALVAR A ENTIDADE (retorna Promise<Chave>)
    const savedChave = await this.chavesRepository.save(novaChave);
    
    return savedChave;
  }

  // ===============================================
  // MÉTODOS AUXILIARES PARA VERIFICAÇÃO AUTOMÁTICA
  // ===============================================

  /**
   * 🆕 Verificar e atualizar status automaticamente
   */
  async checkAndUpdateKeyStatus(chave: Chave): Promise<Chave> {
    let updated = false;
    const now = new Date();

    // ⏰ VERIFICAR CHAVES EXPIRÁVEIS
    if (chave.tipo === ChaveTipo.EXPIRING && 
        chave.data_expiracao && 
        chave.status === ChaveStatus.ATIVA) {
      
      if (now > chave.data_expiracao) {
        chave.status = ChaveStatus.EXPIRADA;
        updated = true;
        console.log(`🔑 Chave expirada automaticamente: ${chave.chave}`);
      }
    }

    // 1️⃣ VERIFICAR CHAVES DE USO ÚNICO
    if (chave.tipo === ChaveTipo.SINGLE_USE && 
        chave.status === ChaveStatus.ATIVA && 
        chave.usos_atual > 0) {
      
      chave.status = ChaveStatus.USADA;
      updated = true;
      console.log(`🔑 Chave de uso único marcada como usada: ${chave.chave}`);
    }

    // 📊 VERIFICAR LIMITE DE USOS
    if (chave.usos_maximo && 
        chave.usos_atual >= chave.usos_maximo && 
        chave.status === ChaveStatus.ATIVA) {
      
      chave.status = ChaveStatus.USADA;
      updated = true;
      console.log(`🔑 Chave com limite de usos atingido: ${chave.chave}`);
    }

    // 💾 SALVAR SE HOUVE MUDANÇAS
    if (updated) {
      await this.chavesRepository.save(chave);
    }

    return chave;
  }

  /**
   * 🆕 Validar e usar chave (incrementa contador + verifica status)
   */
  async validateAndUseKey(chaveCode: string): Promise<{ isValid: boolean; permission?: string; message?: string }> {
    try {
      const chave = await this.chavesRepository.findOne({
        where: { chave: chaveCode }
      });

      if (!chave) {
        return { 
          isValid: false, 
          message: 'Chave de acesso não encontrada' 
        };
      }

      // 🕒 VERIFICAR E ATUALIZAR STATUS ANTES DE VALIDAR
      const updatedChave = await this.checkAndUpdateKeyStatus(chave);

      // 🚫 VERIFICAR SE A CHAVE ESTÁ ATIVA
      if (updatedChave.status !== ChaveStatus.ATIVA) {
        let message = 'Chave de acesso inválida';
        
        switch (updatedChave.status) {
          case ChaveStatus.EXPIRADA:
            message = 'Esta chave de acesso expirou';
            break;
          case ChaveStatus.USADA:
            message = 'Esta chave de acesso já foi utilizada';
            break;
          case ChaveStatus.INATIVA:
            message = 'Esta chave de acesso foi desativada';
            break;
        }

        return { 
          isValid: false, 
          message 
        };
      }

      // ✅ CHAVE VÁLIDA - INCREMENTAR USO
      updatedChave.usos_atual += 1;
      await this.chavesRepository.save(updatedChave);

      // 🔄 VERIFICAR NOVAMENTE APÓS INCREMENTAR (para chaves de uso único)
      await this.checkAndUpdateKeyStatus(updatedChave);

      return {
        isValid: true,
        permission: updatedChave.permissao,
        message: 'Chave de acesso válida'
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
  // MÉTODOS CRUD BÁSICOS (seguindo padrão do projeto)
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
   * Atualizar chave com validações
   */
  async update(id: number, updateData: Partial<Chave>): Promise<Chave> {
    const chave = await this.findById(id);
    
    // 🔒 VALIDAÇÕES DE NEGÓCIO
    if (updateData.status === ChaveStatus.ATIVA) {
      // Não permitir reativar chaves expiradas
      if (chave.tipo === ChaveTipo.EXPIRING && chave.data_expiracao) {
        const now = new Date();
        if (now > chave.data_expiracao) {
          throw new BadRequestException('Não é possível reativar uma chave expirada');
        }
      }
      
      // Não permitir reativar chaves de uso único já usadas
      if (chave.tipo === ChaveTipo.SINGLE_USE && chave.usos_atual > 0) {
        throw new BadRequestException('Não é possível reativar uma chave de uso único já utilizada');
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

    // 🔧 ATUALIZAR NO PADRÃO DO PROJETO
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
   * Excluir chave permanentemente
   */
  async remove(id: number): Promise<void> {
    const chave = await this.findById(id);
    
    // 🔒 APENAS PERMITIR EXCLUSÃO DE CHAVES USADAS OU EXPIRADAS
    if (chave.status === ChaveStatus.ATIVA) {
      throw new BadRequestException('Não é possível excluir uma chave ainda ativa. Desative-a primeiro.');
    }

    await this.chavesRepository.remove(chave);
  }

  // ===============================================
  // MÉTODOS UTILITÁRIOS
  // ===============================================

  /**
   * 🆕 Estatísticas detalhadas das chaves
   */
  async getStatistics(): Promise<any> {
    const chaves = await this.findAll(); // Já aplica verificação automática

    const stats = {
      total: chaves.length,
      ativas: chaves.filter(c => c.status === ChaveStatus.ATIVA).length,
      expiradas: chaves.filter(c => c.status === ChaveStatus.EXPIRADA).length,
      usadas: chaves.filter(c => c.status === ChaveStatus.USADA).length,
      inativas: chaves.filter(c => c.status === ChaveStatus.INATIVA).length,
      tipos: {
        permanent: chaves.filter(c => c.tipo === ChaveTipo.PERMANENT).length,
        expiring: chaves.filter(c => c.tipo === ChaveTipo.EXPIRING).length,
        single_use: chaves.filter(c => c.tipo === ChaveTipo.SINGLE_USE).length,
      },
      expirandoEm24h: chaves.filter(c => {
        if (c.tipo !== ChaveTipo.EXPIRING || !c.data_expiracao || c.status !== ChaveStatus.ATIVA) {
          return false;
        }
        const now = new Date();
        const expiration = new Date(c.data_expiracao);
        const diff = expiration.getTime() - now.getTime();
        const hours = diff / (1000 * 60 * 60);
        return hours > 0 && hours <= 24;
      }).length
    };

    return stats;
  }

  /**
   * Buscar chave por código
   */
  async findByCode(chaveCode: string): Promise<Chave | null> {
    const chave = await this.chavesRepository.findOne({ 
      where: { chave: chaveCode } 
    });
    
    if (!chave) {
      return null;
    }

    // 🕒 VERIFICAR STATUS ANTES DE RETORNAR
    return await this.checkAndUpdateKeyStatus(chave);
  }

  /**
   * Verificar se chave existe
   */
  async exists(chaveCode: string): Promise<boolean> {
    const count = await this.chavesRepository.count({
      where: { chave: chaveCode }
    });
    return count > 0;
  }
}