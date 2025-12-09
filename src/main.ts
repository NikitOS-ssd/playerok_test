import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new PrismaClientExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Marketplace API is running on http://localhost:${port}`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start application', error);
});

