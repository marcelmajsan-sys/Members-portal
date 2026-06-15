import serverlessExpress from '@codegenie/serverless-express';
import app from './app.js';

export const handler = serverlessExpress({
  app,
  binarySettings: {
    contentTypes: ['application/pdf', 'application/octet-stream', 'image/png', 'image/jpeg'],
  },
});
