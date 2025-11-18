import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsDefined, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class MetricsDto {
  @IsNumber()
  temperature: number;

  @IsNumber()
  humidity: number;
}

export class TelemetryDto {
  @IsString()
  deviceId: string;

  @IsString()
  siteId: string;

  @IsDateString()
  ts: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => MetricsDto)
  metrics: MetricsDto;
}

export class SummaryQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
