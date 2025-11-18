import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

function validateEnv(config: Record<string, any>) {
	const errors: string[] = [];
	const requireNonEmpty = (key: string) => {
		if (!config[key] || typeof config[key] !== 'string' || config[key].trim() === '') {
			errors.push(`Missing required env: ${key}`);
		}
	};

	requireNonEmpty('MONGO_URI');
	requireNonEmpty('REDIS_URL');
	requireNonEmpty('ALERT_WEBHOOK_URL');
	// INGEST_TOKEN is optional

	if (errors.length) {
		throw new Error(errors.join('; '));
	}
	return config;
}

@Global()
@Module({
	imports: [
		NestConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env'],
			validate: validateEnv,
		}),
	],
})
export class ConfigModule {}

 
