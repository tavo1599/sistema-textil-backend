import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Busca el decorador @Roles(...) tanto a nivel de MÉTODO como de CLASE.
    // (Antes solo miraba el método, así que @Roles en el controller no se aplicaba.)
    const rolesRequeridos = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay roles requeridos, deja pasar a todos
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    // Obtiene el usuario del token (que fue validado por el JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verifica si el usuario existe y si su rol está en la lista permitida
    return user && rolesRequeridos.includes(user.rol);
  }
}