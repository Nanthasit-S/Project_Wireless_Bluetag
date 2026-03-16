import { buildApp } from './app';
import { AppConfig } from './config/AppConfig';
import { AppContainer } from './container';

async function bootstrap() {
  const config = new AppConfig();
  const container = new AppContainer(config);
  const app = buildApp(container);

  await container.schemaManager.ensureSchema();
  await container.schemaManager.cleanupOldRows();

  const cleanupTimer = setInterval(() => {
    void container.schemaManager.cleanupOldRows().catch((error) => {
      app.log.error({ error }, 'cleanup_failed');
    });
  }, config.tagCleanupIntervalMs);

  cleanupTimer.unref();

  app.addHook('onClose', async () => {
    clearInterval(cleanupTimer);
    await container.database.close();
  });

  await app.listen({ host: '0.0.0.0', port: config.port });
  app.log.info(`Auth API running on port ${config.port}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
