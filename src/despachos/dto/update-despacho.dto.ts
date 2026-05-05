import { PartialType } from '@nestjs/swagger';
import { CreateDespachoDto } from './create-despacho.dto';

export class UpdateDespachoDto extends PartialType(CreateDespachoDto) {}
