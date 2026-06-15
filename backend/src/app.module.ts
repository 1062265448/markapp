import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NickelConfigModule } from './config/config.module';
import { NickelConfigService } from './config/config.service';
import { CommonModule } from './common/common.module';
import { NickelModule } from './nickel/nickel.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [NickelConfigModule],
      inject: [NickelConfigService],
      useFactory: (config: NickelConfigService) => ({
        type: 'mysql' as const,
        host: config.mysqlHost,
        port: config.mysqlPort,
        username: config.mysqlUsername,
        password: config.mysqlPassword,
        database: config.mysqlDatabase,
        autoLoadEntities: true,
        synchronize: config.isDevelopment(),
        logging: config.isDevelopment() ? ['error', 'warn'] : ['error'],
        charset: 'utf8mb4',
      }),
    }),
    ScheduleModule.forRoot(),
    NickelConfigModule,
    CommonModule,
    NickelModule,
  ],
})
export class AppModule {}
