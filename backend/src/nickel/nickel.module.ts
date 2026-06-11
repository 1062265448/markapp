import { Module } from '@nestjs/common';
import { NickelController } from './nickel.controller';
import { NickelService } from './nickel.service';
import { CommonModule } from '../common/common.module';
import { NickelConfigModule } from '../config/config.module';

@Module({
  imports: [CommonModule, NickelConfigModule],
  controllers: [NickelController],
  providers: [NickelService],
})
export class NickelModule {}
