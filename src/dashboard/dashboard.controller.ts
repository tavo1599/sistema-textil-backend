import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('directivo')
  obtenerDatosDirectivos() {
    return this.dashboardService.obtenerDatosDirectivos();
  }
}