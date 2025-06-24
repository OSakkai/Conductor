import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete, 
  UseGuards, 
  ParseIntPipe,
  Query,
  Logger,
  BadRequestException 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserPermission } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard) // ✅ FASE 1: Autenticação obrigatória
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  // ✅ FASE 1: CORREÇÃO CRÍTICA - SEM @Roles
  // Lição do Doc III: Remover @Roles das rotas GET para permitir Visitante
  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('permission') permission?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    try {
      this.logger.debug('Buscando lista de usuários com filtros:', { search, permission, status, limit, offset });

      const users = await this.usersService.findAll({
        search,
        permission,
        status,
        limit: limit ? Math.min(limit, 100) : 50, // ✅ FASE 4: Limitar resultados
        offset: offset || 0,
      });

      this.logger.debug(`Encontrados ${users.length} usuários`);

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Lista de usuários carregada com sucesso',
        data: users.map(user => ({
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          celular: user.celular,
          funcao: user.funcao,
          permissao: user.permissao,
          status: user.status,
          data_criacao: user.data_criacao,
          ultimo_login: user.ultimo_login,
        })),
        total: users.length,
        filters: { search, permission, status },
      };
    } catch (error) {
      this.logger.error('Erro ao buscar usuários:', error);
      return {
        success: false,
        message: 'Erro ao carregar lista de usuários',
        data: [],
        total: 0,
      };
    }
  }

  // ✅ FASE 1: CORREÇÃO CRÍTICA - SEM @Roles
  // Lição do Doc III: Permitir todos usuários autenticados consultarem
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    try {
      this.logger.debug(`Buscando usuário com ID: ${id}`);

      const user = await this.usersService.findById(id);
      
      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
          data: null,
        };
      }

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Usuário encontrado',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          celular: user.celular,
          funcao: user.funcao,
          permissao: user.permissao,
          status: user.status,
          data_criacao: user.data_criacao,
          data_atualizacao: user.data_atualizacao,
          ultimo_login: user.ultimo_login,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar usuário ${id}:`, error);
      return {
        success: false,
        message: 'Erro ao carregar dados do usuário',
        data: null,
      };
    }
  }

  // ✅ FASE 1: Criação apenas para Admins
  @Post()
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      this.logger.debug(`Criando novo usuário: ${createUserDto.nome_usuario}`);

      // ✅ FASE 4: Validações adicionais
      if (!createUserDto.nome_usuario || !createUserDto.email || !createUserDto.senha) {
        throw new BadRequestException('Campos obrigatórios: nome_usuario, email, senha');
      }

      const user = await this.usersService.create(createUserDto);

      this.logger.log(`Usuário criado com sucesso: ${user.nome_usuario} (ID: ${user.id})`);

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          celular: user.celular,
          funcao: user.funcao,
          permissao: user.permissao,
          status: user.status,
          data_criacao: user.data_criacao,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao criar usuário:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      return {
        success: false,
        message: error.message || 'Erro ao criar usuário',
        data: null,
      };
    }
  }

  // ✅ FASE 1: Atualização apenas para Admins
  @Put(':id')
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateData: Partial<CreateUserDto>
  ) {
    try {
      this.logger.debug(`Atualizando usuário ${id}`);

      // ✅ FASE 4: Remover senha do update se estiver vazia
      if (updateData.senha === '') {
        delete updateData.senha;
      }

      const user = await this.usersService.updateUser(id, updateData);

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
          data: null,
        };
      }

      this.logger.log(`Usuário atualizado: ${user.nome_usuario} (ID: ${id})`);

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          celular: user.celular,
          funcao: user.funcao,
          permissao: user.permissao,
          status: user.status,
          data_atualizacao: user.data_atualizacao,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao atualizar usuário ${id}:`, error);
      return {
        success: false,
        message: error.message || 'Erro ao atualizar usuário',
        data: null,
      };
    }
  }

  // ✅ FASE 1: Exclusão apenas para Admins
  @Delete(':id')
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    try {
      this.logger.debug(`Desativando usuário ${id}`);

      const result = await this.usersService.deactivateUser(id);

      if (!result) {
        return {
          success: false,
          message: 'Usuário não encontrado',
        };
      }

      this.logger.log(`Usuário desativado: ID ${id}`);

      // ✅ FASE 2: Resposta padronizada
      return {
        success: true,
        message: 'Usuário desativado com sucesso',
      };
    } catch (error) {
      this.logger.error(`Erro ao desativar usuário ${id}:`, error);
      return {
        success: false,
        message: 'Erro ao desativar usuário',
      };
    }
  }

  // ✅ FASE 4: Endpoint para estatísticas (sem @Roles - todos podem ver)
  @Get('stats/summary')
  async getStats() {
    try {
      const stats = await this.usersService.getStats();
      
      return {
        success: true,
        message: 'Estatísticas carregadas',
        data: stats,
      };
    } catch (error) {
      this.logger.error('Erro ao carregar estatísticas:', error);
      return {
        success: false,
        message: 'Erro ao carregar estatísticas',
        data: {
          total: 0,
          ativos: 0,
          inativos: 0,
          por_permissao: {},
        },
      };
    }
  }

  // ✅ FASE 4: Endpoint para reativar usuário
  @Put(':id/reactivate')
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async reactivate(@Param('id', ParseIntPipe) id: number) {
    try {
      this.logger.debug(`Reativando usuário ${id}`);

      const user = await this.usersService.reactivateUser(id);

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
        };
      }

      this.logger.log(`Usuário reativado: ${user.nome_usuario} (ID: ${id})`);

      return {
        success: true,
        message: 'Usuário reativado com sucesso',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          status: user.status,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao reativar usuário ${id}:`, error);
      return {
        success: false,
        message: 'Erro ao reativar usuário',
      };
    }
  }

  // ✅ FASE 4: Buscar usuários por permissão específica
  @Get('by-permission/:permission')
  async findByPermission(@Param('permission') permission: string) {
    try {
      // Validar se a permissão é válida
      if (!Object.values(UserPermission).includes(permission as UserPermission)) {
        return {
          success: false,
          message: 'Permissão inválida',
          data: [],
        };
      }

      const users = await this.usersService.findByPermission(permission as UserPermission);
      
      return {
        success: true,
        message: `Usuários com permissão ${permission}`,
        data: users.map(user => ({
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          funcao: user.funcao,
          permissao: user.permissao,
          status: user.status,
          ultimo_login: user.ultimo_login,
        })),
        total: users.length,
      };
    } catch (error) {
      this.logger.error(`Erro ao buscar usuários por permissão ${permission}:`, error);
      return {
        success: false,
        message: 'Erro ao buscar usuários',
        data: [],
      };
    }
  }

  // ✅ FASE 4: Buscar apenas usuários ativos
  @Get('active/list')
  async findActiveUsers() {
    try {
      const users = await this.usersService.findActiveUsers();
      
      return {
        success: true,
        message: 'Lista de usuários ativos',
        data: users.map(user => ({
          id: user.id,
          nome_usuario: user.nome_usuario,
          email: user.email,
          funcao: user.funcao,
          permissao: user.permissao,
          ultimo_login: user.ultimo_login,
        })),
        total: users.length,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar usuários ativos:', error);
      return {
        success: false,
        message: 'Erro ao buscar usuários ativos',
        data: [],
      };
    }
  }

  // ✅ FASE 4: Alterar permissão de um usuário (apenas Desenvolvedores)
  @Put(':id/permission')
  @Roles(UserPermission.DESENVOLVEDOR)
  async changePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() permissionData: { permissao: UserPermission }
  ) {
    try {
      this.logger.debug(`Alterando permissão do usuário ${id} para ${permissionData.permissao}`);

      // Validar se a permissão é válida
      if (!Object.values(UserPermission).includes(permissionData.permissao)) {
        return {
          success: false,
          message: 'Permissão inválida',
          data: null,
        };
      }

      const user = await this.usersService.updateUser(id, { 
        permissao: permissionData.permissao 
      });

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
          data: null,
        };
      }

      this.logger.log(`Permissão alterada: ${user.nome_usuario} agora é ${user.permissao}`);

      return {
        success: true,
        message: 'Permissão alterada com sucesso',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          permissao: user.permissao,
          data_atualizacao: user.data_atualizacao,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao alterar permissão do usuário ${id}:`, error);
      return {
        success: false,
        message: 'Erro ao alterar permissão',
        data: null,
      };
    }
  }

  // ✅ FASE 4: Reset de senha (apenas Administradores)
  @Put(':id/reset-password')
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() passwordData: { nova_senha: string }
  ) {
    try {
      this.logger.debug(`Resetando senha do usuário ${id}`);

      if (!passwordData.nova_senha || passwordData.nova_senha.length < 6) {
        return {
          success: false,
          message: 'Nova senha deve ter pelo menos 6 caracteres',
          data: null,
        };
      }

      const user = await this.usersService.updateUser(id, { 
        senha: passwordData.nova_senha 
      });

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
          data: null,
        };
      }

      this.logger.log(`Senha resetada para usuário: ${user.nome_usuario}`);

      return {
        success: true,
        message: 'Senha resetada com sucesso',
        data: {
          id: user.id,
          nome_usuario: user.nome_usuario,
          data_atualizacao: user.data_atualizacao,
        },
      };
    } catch (error) {
      this.logger.error(`Erro ao resetar senha do usuário ${id}:`, error);
      return {
        success: false,
        message: 'Erro ao resetar senha',
        data: null,
      };
    }
  }
}