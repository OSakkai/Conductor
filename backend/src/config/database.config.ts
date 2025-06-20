import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Chave } from '../chaves/chave.entity';
import { LogSistema } from '../logs/log.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
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
};