import app from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

app.listen(env.API_PORT, () => {
  logger.info(`API server running on http://localhost:${env.API_PORT}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});
