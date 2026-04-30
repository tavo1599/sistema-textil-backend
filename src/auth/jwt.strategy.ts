import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'MODITEX_SECRET_KEY_2026', // DEBE ser la misma frase que pusimos en auth.module
    });
  }

  async validate(payload: any) {
    // Esto es lo que el sistema "verá" cuando le pases un token válido
    return { id: payload.sub, email: payload.email, rol: payload.rol };
  }
}