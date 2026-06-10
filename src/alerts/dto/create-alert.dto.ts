import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateAlertDto {

    @ApiProperty({ example: 'OXI-001' })
    @IsString()
    sensorId!: string;

    @ApiProperty({ example: 'oxygen_saturation_low' })
    @IsString()
    type!: string;

    @ApiProperty({ example: 'warning', enum: ['warning', 'critical'] })
    @IsIn(['warning', 'critical'])
    severity!: 'warning' | 'critical';

    @ApiProperty({ example: 'Oxygen saturation below expected range' })
    @IsString()
    message!: string;

    @ApiProperty({ example: false })
    @IsOptional()
    @IsBoolean()
    resolved!: boolean;
}