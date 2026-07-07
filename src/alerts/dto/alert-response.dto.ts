import { ApiProperty } from '@nestjs/swagger';

export class AlertResponseDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  _id!: string;

  @ApiProperty({ example: 'OXI-001' })
  sensorId!: string;

  @ApiProperty({ example: 'oxygen_saturation_low' })
  type!: string;

  @ApiProperty({ example: 'warning', enum: ['warning', 'critical'] })
  severity!: 'warning' | 'critical';

  @ApiProperty({ example: 'Oxygen saturation below expected range' })
  message!: string;

  @ApiProperty({ example: false })
  resolved!: boolean;

  @ApiProperty({ example: '2026-07-04T12:00:00.000Z' })
  occurredAt!: string;

  @ApiProperty({ example: '2026-07-04T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-04T12:00:00.000Z' })
  updatedAt!: string;
}
