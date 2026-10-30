// Entrée : câblage SDK uniquement.
import { GladysIntegration, logger } from '@gladysassistant/integration-sdk';
import { CozytouchApp } from './src/app.js';
import { registerHandlers } from './src/handlers.js';

const gladys = new GladysIntegration();
const app = new CozytouchApp({ gladys });

registerHandlers(gladys, app, logger);
gladys.handleShutdown(() => app.stop());

logger.info('Starting the Atlantic Cozytouch integration...');
gladys.connect().catch((err) => {
  logger.error('Initial connection failed', err);
  process.exit(1);
});
