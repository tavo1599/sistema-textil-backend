import { SetMetadata } from '@nestjs/common';

/**
 * Decorador para restringir una ruta a ciertos roles.
 * Uso: @Roles('ADMIN')  o  @Roles('ADMIN', 'VENDEDOR')
 * Debe ir junto con @UseGuards(JwtAuthGuard, RolesGuard).
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
