import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getHealth() {
    const database =
      this.connection.readyState === ConnectionStates.connected
        ? 'connected'
        : 'disconnected';

    return {
      status: 'ok',
      service: 'iot-platform-backend',
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
