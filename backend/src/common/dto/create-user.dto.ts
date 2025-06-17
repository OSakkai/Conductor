import { UserRole, UserPermission } from '../../users/user.entity';

export class CreateUserDto {
  nome_usuario: string;
  funcao: UserRole;
  permissao: UserPermission;
  email: string;
  celular?: string;
  senha: string;
}