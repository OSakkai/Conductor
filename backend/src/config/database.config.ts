// ===============================================
// CONDUCTOR - DATABASE CONFIG FINAL
// backend/src/config/database.config.ts
// ===============================================

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Chave } from '../chaves/chave.entity';
import { LogSistema } from '../logs/log.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'mysql', // ✅ CORREÇÃO: usar 'mysql' não 'localhost' 
  port: parseInt(process.env.DB_PORT) || 3306,
  
  // ✅ CORREÇÃO DEFINITIVA: usar lab_user, não root
  username: process.env.DB_USERNAME || 'lab_user',
  password: process.env.DB_PASSWORD || 'lab_password123',
  database: process.env.DB_DATABASE || 'lab_sistema',
  
  // 🆕 TODAS AS ENTIDADES REGISTRADAS
  entities: [
    User,        // Entidade de usuários
    Chave,       // 🆕 Entidade de chaves de acesso
    LogSistema   // 🆕 Entidade de logs do sistema
  ],
  
  // ✅ CORREÇÃO CRÍTICA: Desabilitar synchronize pois schema já existe
  synchronize: false, // Banco já tem schema correto via init.sql
  logging: process.env.NODE_ENV === 'development',
  
  // Configurações de conexão
  autoLoadEntities: true,
  retryAttempts: 3,
  retryDelay: 3000,
  
  // Pool de conexões
  extra: {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
  },
  
  // Timezone
  timezone: 'Z', // UTC
  
  // Configurações de charset
  charset: 'utf8mb4',
  
  // SSL (para produção)
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
};