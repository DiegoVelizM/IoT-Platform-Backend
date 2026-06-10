import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { CreateSensorReadingBaseDto } from './create-sensor-reading-base.dto';

export class CreateEnvironmentalDto extends CreateSensorReadingBaseDto {
  @ApiProperty({ example: 22.5 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiProperty({ example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiProperty({ example: 12 })
  @IsOptional()
  @IsNumber()
  gasLevel?: number;

  @ApiProperty({ example: 90 })
  @IsOptional()
  @IsNumber()
  batteryLevel?: number;
}
