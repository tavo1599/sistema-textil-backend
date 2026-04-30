import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Busca si la ruta tiene el decorador @SetMetadata('roles', [...])
    const rolesRequeridos = this.reflector.get<string[]>('roles', context.getHandler());
    
    // Si no hay roles requeridos, deja pasar a todos
    if (!rolesRequeridos) {
      return true;
    }

    // Obtiene el usuario del token (que fue validado por el JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verifica si el usuario existe y si su rol está en la lista permitida
    return user && rolesRequeridos.includes(user.rol);
  }
}