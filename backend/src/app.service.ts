// ===============================================
// CONDUCTOR - APP SERVICE  
// backend/src/app.service.ts
// ===============================================

import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '🎼 CONDUCTOR - Sistema de Gestão Laboratorial ⚡';
  }

  getHealthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'CONDUCTOR API',
      version: '1.0.0'
    };
  }
}