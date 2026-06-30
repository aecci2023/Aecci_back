import cors from 'cors';
import { config as envConfig } from './config';

const rawOrigin = envConfig.CORS_ORIGIN?.replace(/\/+$/, '');

export const corsOptions: cors.CorsOptions = {
  origin: rawOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

export const corsConfig = cors(corsOptions);
