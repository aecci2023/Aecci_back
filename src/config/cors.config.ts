import cors from 'cors';
import { config as envConfig } from './config';

const rawOrigin = envConfig.CORS_ORIGIN 
  ? envConfig.CORS_ORIGIN.split(',').map(o => o.trim().replace(/\/+$/, ''))
  : '*';

export const corsOptions: cors.CorsOptions = {
  origin: rawOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

export const corsConfig = cors(corsOptions);
