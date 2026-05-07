import { IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  alertId: string;

  @IsString()
  sensorId: string;

  @IsString()
  type: string;

  @IsString()
  message: string;

  @IsIn(['low', 'medium', 'high', 'critical'])
  severity: string;

  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;
}