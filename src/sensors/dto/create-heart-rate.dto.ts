import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';
import { CreateSensorReadingBaseDto } from './create-sensor-reading-base.dto';

export class CreateHeartRateDto extends CreateSensorReadingBaseDto {
  @ApiProperty({ example: 72 })
  @IsNumber()
  @Min(20)
  @Max(220)
  heart_rate!: number;

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  battery?: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  @Max(100)
  signal_strength?: number;
}
