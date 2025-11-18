import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../config/redis.module';
import type { Redis } from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async get() {
    const mongoOk = this.connection.readyState === 1;
    let redisOk = false;
    try {
      await this.redis.ping();
      redisOk = true;
    } catch {
      redisOk = false;
    }
    return { mongo: mongoOk ? 'ok' : 'down', redis: redisOk ? 'ok' : 'down' };
  }
}
