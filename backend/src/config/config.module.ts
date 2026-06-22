import { Global, Module } from '@nestjs/common';
import { NickelConfigService } from './config.service';

@Global()
@Module({
  providers: [NickelConfigService],
  exports: [NickelConfigService],
})
export class NickelConfigModule {}
