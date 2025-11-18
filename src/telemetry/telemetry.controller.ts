import { Body, Controller, Get, Param, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { TelemetryDto, SummaryQueryDto } from './dto/telemetry.dto';
import { IngestTokenGuard } from './guards/ingest-token.guard';
import { ArrayNotEmpty, IsArray, ValidateNested, validateSync } from 'class-validator';
import { Type, plainToInstance } from 'class-transformer';

class TelemetryArrayDto {
	@IsArray()
	@ArrayNotEmpty()
	@ValidateNested({ each: true })
	@Type(() => TelemetryDto)
	items: TelemetryDto[];
}

@Controller()
export class TelemetryController {
	constructor(private readonly telemetry: TelemetryService) {}

	@Post('telemetry')
	@UseGuards(IngestTokenGuard)
	async ingest(@Body() body: unknown) {
		let batch: unknown[];
		if ((body as any)?.items) batch = (body as any).items;
		else if (Array.isArray(body)) batch = body as unknown[];
		else batch = [body];

		const validated: TelemetryDto[] = [];
		for (const item of batch) {
			const inst = plainToInstance(TelemetryDto, item);
			const errors = validateSync(inst as object, { whitelist: true, forbidNonWhitelisted: true });
			if (errors.length) {
				throw new BadRequestException(errors);
			}
			validated.push(inst);
		}
		return this.telemetry.ingest(validated);
	}

	@Get('devices/:deviceId/latest')
	async latest(@Param('deviceId') deviceId: string) {
		return this.telemetry.getLatest(deviceId);
	}

	@Get('sites/:siteId/summary')
	async summary(
		@Param('siteId') siteId: string,
		@Query() query: SummaryQueryDto,
	) {
		const from = new Date(query.from);
		const to = new Date(query.to);
		return this.telemetry.getSiteSummary(siteId, from, to);
	}
}
