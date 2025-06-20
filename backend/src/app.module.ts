import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChavesModule } from './chaves/chaves.module';
import { LogsModule } from './logs/logs.module';
import { User } from './users/user.entity';
import { Chave } from './chaves/chave.entity';
import { LogSistema } from './logs/log.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'mysql',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'lab_user',
      password: process.env.DB_PASSWORD || 'lab_password123',
      database: process.env.DB_DATABASE || 'lab_sistema',
      entities: [
        User,
        Chave,
        LogSistema,
      ],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
      timezone: 'Z',
    }),
    AuthModule,
    UsersModule,
    ChavesModule,
    LogsModule,
  ],
})
export class AppModule {}