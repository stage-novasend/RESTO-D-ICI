// src/config/data-source.ts
// Source de données unique — utilisée par l'application ET par la CLI TypeORM
// (génération / exécution des migrations).
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || process.env.DB_USER || 'restodici_user',
  password: process.env.DB_PASSWORD || 'restodici_pass',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'restodici_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true',
};

// Instance par défaut pour la CLI (`-d src/config/data-source.ts`).
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
