import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IngestTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.config.get<string>('INGEST_TOKEN');
    if (!required) return true; // no auth configured
    const req = context.switchToHttp().getRequest();
    const header = req.headers['authorization'] as string | undefined;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.substring('Bearer '.length).trim();
    if (token !== required) {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}
