// ===============================================
// CONDUCTOR - APP MODULE ATUALIZADO
// backend/src/app.module.ts
// ===============================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// Configuração do banco
import { databaseConfig } from './config/database.config';

// Módulos da aplicação
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChavesModule } from './chaves/chaves.module';  // 🆕 MÓDULO DE CHAVES
import { LogsModule } from './logs/logs.module';        // 🆕 MÓDULO DE LOGS

// Controllers e Services globais
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // 🔧 CONFIGURAÇÃO DE AMBIENTE
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 🔧 CONFIGURAÇÃO DO BANCO DE DADOS
    TypeOrmModule.forRoot(databaseConfig),

    // 🔧 CONFIGURAÇÃO JWT GLOBAL
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'conductor-secret-key-2025',
      signOptions: { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
      },
    }),

    // 📋 MÓDULOS DA APLICAÇÃO
    AuthModule,     // Autenticação e autorização
    UsersModule,    // Gestão de usuários
    ChavesModule,   // 🆕 Gestão de chaves de acesso
    LogsModule,     // 🆕 Sistema de logs
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  constructor() {
    console.log('🎼 CONDUCTOR - Sistema inicializado com sucesso!');
    console.log('⚡ Módulos carregados:');
    console.log('   📋 AuthModule - Autenticação JWT');
    console.log('   👥 UsersModule - Gestão de usuários');
    console.log('   🔑 ChavesModule - Sistema de chaves de acesso');
    console.log('   📋 LogsModule - Sistema de auditoria');
    console.log('   💾 Database - MySQL com TypeORM');
    console.log('');
    console.log('🚀 Sistema pronto para uso!');
  }
}