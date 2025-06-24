import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  UnauthorizedException,
  Logger 
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserPermission } from '../../users/user.entity';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      this.logger.warn('Token não fornecido na requisição');
      throw new UnauthorizedException('Token de acesso não fornecido');
    }

    try {
      // ✅ CORREÇÃO: Verificar se JWT_SECRET existe
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        this.logger.error('JWT_SECRET não configurado');
        throw new UnauthorizedException('Configuração de segurança inválida');
      }

      // ✅ FASE 1: Verificar token com secret correto
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });
      
      // ✅ FASE 1: Adicionar payload padronizado ao request
      request['user'] = {
        userId: payload.sub,
        sub: payload.sub, // Compatibilidade
        nome_usuario: payload.nome_usuario,
        permissao: payload.permissao,
        email: payload.email,
        funcao: payload.funcao,
      };

      this.logger.debug(`Token válido para usuário: ${payload.nome_usuario}`);

      // ✅ FASE 1: Verificar roles se necessário
      const requiredRoles = this.reflector.getAllAndOverride<UserPermission[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      // Se não há roles específicas requeridas, permitir acesso
      if (!requiredRoles || requiredRoles.length === 0) {
        this.logger.debug('Nenhuma role específica requerida - acesso permitido');
        return true;
      }

      // ✅ FASE 1: CORREÇÃO CRÍTICA - Comparação direta em vez de includes()
      // Lição do Doc III: includes() não funciona em strings
      const hasRequiredRole = requiredRoles.some((role) => {
        const hasRole = payload.permissao === role;
        this.logger.debug(`Verificando role ${role}: ${hasRole ? '✅' : '❌'}`);
        return hasRole;
      });

      if (!hasRequiredRole) {
        this.logger.warn(`Acesso negado. Usuário ${payload.nome_usuario} (${payload.permissao}) tentou acessar recurso que requer: [${requiredRoles.join(', ')}]`);
        throw new UnauthorizedException('Permissão insuficiente para acessar este recurso');
      }

      this.logger.debug(`Acesso autorizado para ${payload.nome_usuario} com permissão ${payload.permissao}`);
      return true;

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error('Erro na validação do token:', error.message);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        return undefined;
      }

      const [type, token] = authHeader.split(' ');
      
      if (type !== 'Bearer' || !token) {
        this.logger.warn('Formato de authorization header inválido');
        return undefined;
      }

      return token;
    } catch (error) {
      this.logger.error('Erro ao extrair token do header:', error);
      return undefined;
    }
  }

  // ✅ FASE 4: Método utilitário para debug
  private logPermissionCheck(userPermission: string, requiredRoles: UserPermission[]): void {
    this.logger.debug('=== VERIFICAÇÃO DE PERMISSÃO ===');
    this.logger.debug(`Usuário possui: ${userPermission}`);
    this.logger.debug(`Roles requeridas: [${requiredRoles.join(', ')}]`);
    
    const permissions = ['Visitante', 'Usuario', 'Operador', 'Administrador', 'Desenvolvedor'];
    const userLevel = permissions.indexOf(userPermission);
    this.logger.debug(`Nível do usuário: ${userLevel} (${userPermission})`);
    
    requiredRoles.forEach(role => {
      const requiredLevel = permissions.indexOf(role);
      const hasAccess = userLevel >= requiredLevel;
      this.logger.debug(`${role} (nível ${requiredLevel}): ${hasAccess ? '✅' : '❌'}`);
    });
  }
}