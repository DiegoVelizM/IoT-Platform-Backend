import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { of, throwError } from 'rxjs';
import { NotificationsService } from '../notifications.service';
import { FailedNotification } from '../schemas/failed-notification.schema';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const httpService = {
    post: jest.fn(),
  };

  const failedModel = {
    create: jest.fn(),
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        lean: jest.fn(() => ({
          exec: jest.fn().mockResolvedValue([]),
        })),
        exec: jest.fn().mockResolvedValue([]),
      })),
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                NOTIFICATIONS_API_URL: 'https://ucn-agil-notificaciones.up.railway.app',
                NOTIFICATIONS_API_KEY: '7KpQmXvRnB2sYwZ9eHtJdF5gCuA3LiN8',
                NOTIFICATIONS_DEFAULT_EMAIL: 'ops@ejemplo.com',
              };

              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: getModelToken(FailedNotification.name),
          useValue: failedModel,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.spyOn(service as any, 'sleep').mockResolvedValue(undefined);
  });

  it('should send notification on first attempt', async () => {
    httpService.post.mockReturnValue(
      of({
        status: 201,
        data: { delivered: true },
      }),
    );

    const result = await service.sendNotification({
      sensorId: 'OXI-001',
      severity: 'critical',
      message: 'Low oxygen saturation',
      channel: 'email',
      recipient: {
        email: 'destinatario@ejemplo.com',
      },
      body: {
        email: '<p>Low oxygen saturation</p>',
      },
      subject: 'Alerta critica',
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it('should persist failed notification after 3 attempts', async () => {
    failedModel.create.mockResolvedValue({
      _id: 'failed-id',
    });

    httpService.post.mockReturnValue(
      throwError(() => ({
        message: 'Request failed with status code 500',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'downstream error' },
        },
      })),
    );

    const result = await service.sendNotification({
      sensorId: 'THERMO-001',
      severity: 'critical',
      message: 'Temperature out of range',
      recipient: {
        email: 'destinatario@ejemplo.com',
      },
      body: {
        email: '<p>Temperature out of range</p>',
      },
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(httpService.post).toHaveBeenCalledTimes(3);
    expect(failedModel.create).toHaveBeenCalledTimes(1);
  });
});
