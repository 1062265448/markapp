import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NickelConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { NickelModule } from './nickel/nickel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    NickelConfigModule,
    CommonModule,
    NickelModule,
  ],
})
export class AppModule {}
