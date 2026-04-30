import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger'; // <-- Cambiado a ApiOperation
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Ingresar al sistema con código y clave' }) // <-- Cambiado a ApiOperation
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.codigo, loginDto.pass);
  }
}