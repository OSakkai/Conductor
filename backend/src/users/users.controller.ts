import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserPermission } from './user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ✅ SEM @Roles - TODOS USUÁRIOS AUTENTICADOS PODEM ACESSAR
  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return {
      success: true,
      message: 'Lista de usuários',
      data: users,
      total: users.length,
    };
  }

  // ✅ SEM @Roles - TODOS USUÁRIOS AUTENTICADOS PODEM ACESSAR
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    return {
      success: true,
      message: 'Usuário encontrado',
      data: user,
    };
  }

  @Post()
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return {
      success: true,
      message: 'Usuário criado com sucesso',
      data: user,
    };
  }

  @Put(':id')
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateData: Partial<CreateUserDto>) {
    const user = await this.usersService.updateUser(id, updateData);
    return {
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: user,
    };
  }

  @Delete(':id')
  @Roles(UserPermission.ADMINISTRADOR, UserPermission.DESENVOLVEDOR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.deactivateUser(id);
    return {
      success: true,
      message: 'Usuário desativado com sucesso',
    };
  }
}