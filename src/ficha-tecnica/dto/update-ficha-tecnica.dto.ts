import { PartialType } from '@nestjs/swagger';
import { CreateFichaTecnicaDto } from './create-ficha-tecnica.dto';

export class UpdateFichaTecnicaDto extends PartialType(CreateFichaTecnicaDto) {}
