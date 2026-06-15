import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NickelController } from './nickel.controller';
import { NickelService } from './nickel.service';
import { NickelHistoryService } from './nickel-history.service';
import { CommonModule } from '../common/common.module';
import { NickelConfigModule } from '../config/config.module';
import { CompareRecord } from './entities/compare-record.entity';
import { CompareImage } from './entities/compare-image.entity';

@Module({
  imports: [
    CommonModule,
    NickelConfigModule,
    TypeOrmModule.forFeature([CompareRecord, CompareImage]),
  ],
  controllers: [NickelController],
  providers: [NickelService, NickelHistoryService],
})
export class NickelModule {}
