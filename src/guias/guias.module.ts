import { Module } from '@nestjs/common';
import { GuiasService } from './guias.service';
import { GuiasController } from './guias.controller';
import { PdfService } from '../common/pdf.service'; // <-- Importa el servicio
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GuiasController],
  providers: [GuiasService, PdfService], // <-- Agrega PdfService aquí
})
export class GuiasModule {}