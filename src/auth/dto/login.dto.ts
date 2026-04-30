import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ 
    example: 'USR-001', 
    description: 'Tu código de usuario de MODITEX' 
  })
  @IsNotEmpty()
  @IsString()
  codigo!: string;

  @ApiProperty({ 
    example: 'admin123', 
    description: 'Tu contraseña secreta' 
  })
  @IsNotEmpty()
  @IsString()
  pass!: string;
}