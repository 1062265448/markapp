import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NickelConfigService } from './config.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [NickelConfigService],
  exports: [NickelConfigService],
})
export class NickelConfigModule {}
