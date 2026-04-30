import { PartialType } from '@nestjs/swagger';
import { CreateLiquidationDto } from './create-liquidacione.dto';

export class UpdateLiquidacioneDto extends PartialType(CreateLiquidationDto) {}
