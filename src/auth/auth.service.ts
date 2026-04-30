import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    
    if (usuario && (await bcrypt.compare(pass, usuario.password))) {
      const payload = { sub: usuario.id, email: usuario.email, rol: usuario.rol };
      return {
        access_token: this.jwtService.sign(payload),
        usuario: { nombre: usuario.nombre, rol: usuario.rol },
      };
    }
    throw new UnauthorizedException('Credenciales incorrectas');
  }
}