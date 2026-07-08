import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

export class NotificationRecipientDto {
  @ApiProperty({
    required: false,
    example: 'destinatario@ejemplo.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '+56912345678' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{7,14}$/)
  telefono?: string;
}

export class NotificationBodyDto {
  @ApiProperty({
    required: false,
    example: '<p>Tu pedido ha sido confirmado.</p>',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false, example: 'Tu pedido ha sido confirmado.' })
  @IsOptional()
  @IsString()
  sms?: string;
}

export class CreateNotificationDto {
  @ApiProperty({
    required: false,
    enum: ['email', 'sms'],
    example: 'email',
  })
  @IsOptional()
  @IsIn(['email', 'sms'])
  channel?: 'email' | 'sms';

  @ApiProperty({
    required: false,
    type: () => NotificationRecipientDto,
    example: { email: 'destinatario@ejemplo.com', telefono: '+56912345678' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationRecipientDto)
  recipient?: NotificationRecipientDto;

  @ApiProperty({ required: false, example: 'Confirmacion de pedido' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    required: false,
    type: () => NotificationBodyDto,
    example: {
      email: '<p>Tu pedido ha sido confirmado.</p>',
      sms: 'Tu pedido ha sido confirmado.',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationBodyDto)
  body?: NotificationBodyDto;

  @ApiProperty({ required: false, example: 'OXI-001' })
  @IsOptional()
  @IsString()
  sensorId?: string;

  @ApiProperty({ required: false, example: 'PATIENT-001' })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiProperty({ required: false, example: 'oxygen_saturation_low' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, example: 'critical' })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiProperty({
    required: false,
    example: 'Oxygen saturation below expected range',
  })
  @IsOptional()
  @IsString()
  message?: string;
}

export class NotificationErrorDto {
  @ApiProperty({ example: 'Request failed with status code 500' })
  message!: string;

  @ApiProperty({
    required: false,
    example: {
      status: 500,
      code: 'ECONNABORTED',
    },
  })
  details?: Record<string, unknown>;
}

export class NotificationPayloadDto {
  @ApiProperty({ enum: ['email', 'sms'], example: 'email' })
  channel!: 'email' | 'sms';

  @ApiProperty({
    type: () => NotificationRecipientDto,
    example: { email: 'destinatario@ejemplo.com' },
  })
  recipient!: NotificationRecipientDto;

  @ApiProperty({ required: false, example: 'Confirmacion de pedido' })
  subject?: string;

  @ApiProperty({
    type: () => NotificationBodyDto,
    example: {
      email: '<p>Tu pedido ha sido confirmado.</p>',
      sms: 'Tu pedido ha sido confirmado.',
    },
  })
  body!: NotificationBodyDto;
}

export class NotificationResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Notification sent successfully' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({ example: 1 })
  attempts!: number;

  @ApiProperty({ required: false, example: 201 })
  statusCode?: number;

  @ApiProperty({
    required: false,
    type: () => NotificationErrorDto,
    example: {
      message: 'Request failed with status code 500',
      details: { status: 500 },
    },
  })
  error?: NotificationErrorDto;

  @ApiProperty({
    required: false,
    type: () => NotificationPayloadDto,
    example: {
      channel: 'email',
      recipient: { email: 'destinatario@ejemplo.com' },
      subject: 'Confirmacion de pedido',
      body: { email: '<p>Tu pedido ha sido confirmado.</p>' },
    },
  })
  payload?: NotificationPayloadDto;
}

export class FailedNotificationDto {
  @ApiProperty({ example: '66b0f5f5e2f5f5f5f5f5f5f5' })
  id!: string;

  @ApiProperty({ type: () => NotificationPayloadDto })
  payload!: NotificationPayloadDto;

  @ApiProperty({
    required: false,
    example: {
      sensorId: 'OXI-001',
      severity: 'critical',
    },
  })
  alertSnapshot?: Record<string, unknown>;

  @ApiProperty({ example: 'Request failed with status code 500' })
  errorMessage!: string;

  @ApiProperty({
    required: false,
    example: {
      status: 500,
      response: 'Gateway timeout',
    },
  })
  errorDetails?: Record<string, unknown>;

  @ApiProperty({ example: 2 })
  attempts!: number;

  @ApiProperty({
    enum: ['pending', 'retried', 'resolved'],
    example: 'pending',
  })
  status!: 'pending' | 'retried' | 'resolved';

  @ApiProperty({
    required: false,
    example: '2026-07-08T12:00:00.000Z',
  })
  lastAttemptAt?: Date;

  @ApiProperty({ example: 0 })
  retryCount!: number;

  @ApiProperty({ required: false, example: '2026-07-08T11:55:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ required: false, example: '2026-07-08T12:00:00.000Z' })
  updatedAt?: Date;
}

export class RetryFailedNotificationsResponseDto {
  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 2 })
  success!: number;

  @ApiProperty({ example: 1 })
  failed!: number;

  @ApiProperty({ type: () => [NotificationResponseDto] })
  results!: NotificationResponseDto[];
}
