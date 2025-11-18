import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TelemetryDocument = HydratedDocument<Telemetry>;

@Schema({ _id: false })
export class Metrics {
  @Prop({ type: Number, required: true })
  temperature: number;

  @Prop({ type: Number, required: true })
  humidity: number;
}

const MetricsSchema = SchemaFactory.createForClass(Metrics);

@Schema({ collection: 'telemetry', timestamps: false })
export class Telemetry {
  @Prop({ type: String, required: true, index: true })
  deviceId: string;

  @Prop({ type: String, required: true, index: true })
  siteId: string;

  @Prop({ type: Date, required: true, index: true })
  ts: Date;

  @Prop({ type: MetricsSchema, required: true })
  metrics: Metrics;
}

export const TelemetrySchema = SchemaFactory.createForClass(Telemetry);
TelemetrySchema.index({ siteId: 1, ts: 1 });
TelemetrySchema.index({ deviceId: 1, ts: -1 });
