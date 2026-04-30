import { PartialType } from '@nestjs/swagger';
import { CreateOrdeneDto } from './create-ordene.dto';

export class UpdateOrdeneDto extends PartialType(CreateOrdeneDto) {}
