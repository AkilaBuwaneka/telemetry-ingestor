import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Telemetry, TelemetryDocument } from './schemas/telemetry.schema';
import { TelemetryDto } from './dto/telemetry.dto';
import { AlertService, AlertReason } from '../alert/alert.service';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../config/redis.module';
import type { Redis } from 'ioredis';

@Injectable()
export class TelemetryService {
	private readonly logger = new Logger(TelemetryService.name);
	constructor(
		@InjectModel(Telemetry.name) private readonly telemetryModel: Model<TelemetryDocument>,
		private readonly alertService: AlertService,
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
	) {}

	async ingest(input: TelemetryDto[]): Promise<{ inserted: number }> {
		// Persist to Mongo
		const docs = input.map((d) => ({ ...d, ts: new Date(d.ts) }));
		if (docs.length) {
			await this.telemetryModel.insertMany(docs, { ordered: false });
		}

		// Cache latest per device and check alerts
		for (const d of input) {
			const key = `latest:${d.deviceId}`;
			await this.redis.set(key, JSON.stringify(d));
			await this.checkAndAlert(d);
		}
		return { inserted: docs.length };
	}

	private async checkAndAlert(d: TelemetryDto): Promise<void> {
		const { temperature, humidity } = d.metrics;
		const ts = d.ts;
		const alerts: { reason: AlertReason; value: number }[] = [];
		if (typeof temperature === 'number' && temperature > 50) {
			alerts.push({ reason: 'HIGH_TEMPERATURE', value: temperature });
		}
		if (typeof humidity === 'number' && humidity > 90) {
			alerts.push({ reason: 'HIGH_HUMIDITY', value: humidity });
		}
		for (const a of alerts) {
			const dedupKey = `alertdedup:${d.deviceId}:${a.reason}`;
			const set = await this.redis.set(dedupKey, '1', 'EX', 60, 'NX');
			if (set === 'OK') {
				await this.alertService.sendAlert({
					deviceId: d.deviceId,
					siteId: d.siteId,
					ts,
					reason: a.reason,
					value: a.value,
				});
			} else {
				this.logger.debug(`Dedup alert ${a.reason} for ${d.deviceId}`);
			}
		}
	}

	async getLatest(deviceId: string): Promise<TelemetryDto | null> {
		const key = `latest:${deviceId}`;
		const cached = await this.redis.get(key);
		if (cached) return JSON.parse(cached);

		const doc = await this.telemetryModel
			.findOne({ deviceId })
			.sort({ ts: -1 })
			.lean<Telemetry>();
		if (!doc) return null;
		const payload: TelemetryDto = {
			deviceId: doc.deviceId,
			siteId: doc.siteId,
			ts: doc.ts.toISOString(),
			metrics: { temperature: doc.metrics.temperature, humidity: doc.metrics.humidity },
		};
		await this.redis.set(key, JSON.stringify(payload));
		return payload;
	}

	async getSiteSummary(siteId: string, from: Date, to: Date) {
		const match = { siteId, ts: { $gte: from, $lte: to } };
		const res = await this.telemetryModel.aggregate([
			{ $match: match },
			{
				$group: {
					_id: null,
					count: { $sum: 1 },
					avgTemperature: { $avg: '$metrics.temperature' },
					maxTemperature: { $max: '$metrics.temperature' },
					avgHumidity: { $avg: '$metrics.humidity' },
					maxHumidity: { $max: '$metrics.humidity' },
					devices: { $addToSet: '$deviceId' },
				},
			},
			{
				$project: {
					_id: 0,
					count: 1,
					avgTemperature: { $ifNull: ['$avgTemperature', 0] },
					maxTemperature: { $ifNull: ['$maxTemperature', 0] },
					avgHumidity: { $ifNull: ['$avgHumidity', 0] },
					maxHumidity: { $ifNull: ['$maxHumidity', 0] },
					uniqueDevices: { $size: '$devices' },
				},
			},
		]);
		return res[0] || {
			count: 0,
			avgTemperature: 0,
			maxTemperature: 0,
			avgHumidity: 0,
			maxHumidity: 0,
			uniqueDevices: 0,
		};
	}
}
