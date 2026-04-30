import { Controller, Get, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger'; // Importante para Swagger
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @ApiBearerAuth() // Le dice a Swagger: "Dibuja un candado aquí"
  @UseGuards(JwtAuthGuard, RolesGuard) // Llama al guardia del token y al de roles
  @SetMetadata('roles', ['ADMIN']) // Exige que el rol sea ADMIN
  @Get('dashboard')
  getDashboard() {
    return this.reportesService.obtenerResumenGeneral();
  }
}