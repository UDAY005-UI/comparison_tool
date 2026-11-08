import { Module } from '@nestjs/common';
import { CompareModule } from './compare/compare.module';
import { HealthController } from './health/health.controller';
import { KeepAliveService } from './health/keep-alive.service';

@Module({
  imports: [CompareModule],
  controllers: [HealthController],
  providers: [KeepAliveService],
})
export class AppModule {}