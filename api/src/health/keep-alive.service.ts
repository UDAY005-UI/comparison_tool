import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KeepAliveService.name);
  private timer: NodeJS.Timeout | null = null;

  onModuleInit() {
    const baseUrl =
      process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
    if (!baseUrl) {
      this.logger.warn('KEEP_ALIVE_URL not set, keep-alive disabled');
      return;
    }

    const intervalMs =
      Number(process.env.KEEP_ALIVE_INTERVAL_MS) || 10 * 60 * 1000;
    const url = `${baseUrl.replace(/\/$/, '')}/health`;

    this.timer = setInterval(() => {
      void this.ping(url);
    }, intervalMs);
  }

  private async ping(url: string) {
    try {
      const res = await fetch(url);
      this.logger.log(`Ping ${url} -> ${res.status}`);
    } catch (err) {
      this.logger.error(
        `Ping failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
