import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NickelController } from './nickel.controller';
import { NickelService } from './nickel.service';
import { NickelHistoryService } from './nickel-history.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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
  controllers: [NickelController, AuthController],
  providers: [NickelService, NickelHistoryService, AuthService],
  exports: [AuthService],
})
export class NickelModule {}
