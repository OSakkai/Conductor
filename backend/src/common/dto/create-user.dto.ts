// ===============================================
// CONDUCTOR - CREATE USER DTO COMPLETO ORIGINAL + CHAVE
// backend/src/common/dto/create-user.dto.ts
// ===============================================

import { UserRole, UserPermission } from '../../users/user.entity';

export class CreateUserDto {
  nome_usuario: string;
  funcao: UserRole;
  permissao?: UserPermission;
  email: string;
  celular?: string;
  senha: string;
  chave_acesso?: string; // ✅ ÚNICA ADIÇÃO AO ORIGINAL
}