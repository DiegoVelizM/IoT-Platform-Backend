import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsString } from 'class-validator';

export class CreateAlertDto {

    @ApiProperty({ example: 'ESP32-001' })
    @IsString()
    sensorId!: string;

    @ApiProperty({ example: 'gas_detected' })
    @IsString()
    type!: string;

    @ApiProperty({ example: 'warning' })
    @IsIn(['warning', 'critical'])
    severity!: 'warning' | 'critical';

    @ApiProperty({ example: 'Gas level exceeded threshold' })
    @IsString()
    message!: string;

    @ApiProperty({ example: false })
    @IsBoolean()
    resolved!: boolean;
}