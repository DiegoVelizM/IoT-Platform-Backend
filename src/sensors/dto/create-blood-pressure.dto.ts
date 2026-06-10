import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';
import { CreateSensorReadingBaseDto } from './create-sensor-reading-base.dto';

export class CreateBloodPressureDto extends CreateSensorReadingBaseDto {
  @ApiProperty({ example: 120 })
  @IsNumber()
  @Min(40)
  @Max(300)
  systolic!: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(30)
  @Max(200)
  diastolic!: number;

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
