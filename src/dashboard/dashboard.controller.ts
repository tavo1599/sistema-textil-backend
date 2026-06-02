import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard) // Requiere login (ambos roles ven su dashboard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('directivo')
  obtenerDatosDirectivos() {
    return this.dashboardService.obtenerDatosDirectivos();
  }
}