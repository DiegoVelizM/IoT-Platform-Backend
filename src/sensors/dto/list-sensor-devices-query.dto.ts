import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MedicalSensorType } from './create-sensor-reading.dto';

export class ListSensorDevicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: MedicalSensorType,
    description: 'Filtrar por tipo de sensor médico',
  })
  @IsOptional()
  @IsEnum(MedicalSensorType)
  sensorType?: MedicalSensorType;

  @ApiPropertyOptional({
    example: 'OXI',
    description: 'Búsqueda parcial por sensorId (insensible a mayúsculas)',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
