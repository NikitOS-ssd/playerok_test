import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Marketplace API is running on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start application', error);
});

