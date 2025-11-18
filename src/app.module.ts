import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemetryModule } from './telemetry/telemetry.module';
import { ConfigModule } from './config/config.module';
import { AlertService } from './alert/alert.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from './config/redis.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        serverSelectionTimeoutMS: 5000,
      }),
    }),
    RedisModule,
    TelemetryModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, AlertService],
})
export class AppModule {}
