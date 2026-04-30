import { PartialType } from '@nestjs/swagger';
import { CreateAlmacenTerminadoDto } from './create-almacen-terminado.dto';

export class UpdateAlmacenTerminadoDto extends PartialType(CreateAlmacenTerminadoDto) {}
