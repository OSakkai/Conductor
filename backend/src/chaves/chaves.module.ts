// ===============================================
// CONDUCTOR - CHAVES MODULE CORRIGIDO
// backend/src/chaves/chaves.module.ts
// ===============================================

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChavesController } from './chaves.controller';
import { ChavesService } from './chaves.service';
import { Chave } from './chave.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chave]),
    // 🔧 REMOVER forwardRef CIRCULAR - AuthModule já importa ChavesModule
  ],
  controllers: [ChavesController],
  providers: [ChavesService],
  exports: [ChavesService], // Exportar para AuthModule
})
export class ChavesModule {
  constructor() {
    console.log('🔑 ChavesModule inicializado');
  }
}