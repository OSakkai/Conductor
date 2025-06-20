import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LogsService } from './logs.service';
import { LogSistema } from './log.entity';

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async findAll() {
    try {
      const logs = await this.logsService.findAll();
      return {
        success: true,
        data: logs,
        message: 'Logs carregados com sucesso',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao carregar logs',
        error: error.message,
      };
    }
  }

  @Post()
  async create(@Body() logData: Partial<LogSistema>) {
    try {
      const log = await this.logsService.create(logData);
      return {
        success: true,
        data: log,
        message: 'Log registrado com sucesso',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao registrar log',
        error: error.message,
      };
    }
  }
}