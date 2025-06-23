// ===============================================
// CONDUCTOR - AUTH MODULE CORRIGIDO
// backend/src/auth/auth.module.ts
// ===============================================

import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Controllers e Services
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

// Módulos necessários
import { UsersModule } from '../users/users.module';
import { ChavesModule } from '../chaves/chaves.module';

@Module({
  imports: [
    // 🔧 CONFIGURAÇÃO DO PASSPORT
    PassportModule,
    
    // 🔧 CONFIGURAÇÃO JWT (local - sobrescreve a global se necessário)
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'conductor-secret-key-2025',
      signOptions: { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h' 
      },
    }),

    // 📋 DEPENDÊNCIAS DE OUTROS MÓDULOS COM forwardRef
    forwardRef(() => UsersModule),    // Para acessar UsersService
    forwardRef(() => ChavesModule),   // Para acessar ChavesService no registro
  ],

  controllers: [AuthController],
  
  providers: [
    AuthService,    // Serviço principal de autenticação
    JwtStrategy,    // Estratégia JWT para Passport
  ],
  
  exports: [
    AuthService,    // Exportar para outros módulos que precisem
    JwtModule,      // Exportar JwtModule para reutilização
  ],
})
export class AuthModule {
  constructor() {
    console.log('🔐 AuthModule inicializado com integração de chaves');
  }
}