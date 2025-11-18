import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

export type AlertReason = 'HIGH_TEMPERATURE' | 'HIGH_HUMIDITY';

export interface AlertPayload {
	deviceId: string;
	siteId: string;
	ts: string;
	reason: AlertReason;
	value: number;
}

@Injectable()
export class AlertService {
	private readonly logger = new Logger(AlertService.name);
	private readonly webhookUrl: string;
	constructor(config: ConfigService) {
		this.webhookUrl = config.getOrThrow<string>('ALERT_WEBHOOK_URL');
	}

	async sendAlert(alert: AlertPayload): Promise<void> {
		try {
			await axios.post(this.webhookUrl, alert, { timeout: 3000 });
			this.logger.log(`Alert sent: ${alert.reason} for device ${alert.deviceId}`);
		} catch (err) {
			this.logger.warn(`Failed to send alert: ${String((err as any)?.message || err)}`);
		}
	}
}
