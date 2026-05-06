import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { EventType } from '../../common/events/event-types';

export class TestEventDto {
    @ApiProperty({ example: 'evt-001' })
    @IsString()
    eventId!: string;

    @ApiProperty({ enum: EventType, example: EventType.TELEMETRY_RECEIVED })
    @IsEnum(EventType)
    eventType!: EventType;

    @ApiProperty({ example: 'iot-platform' })
    @IsString()
    source!: string;
}