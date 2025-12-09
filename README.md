# Marketplace Backend (NestJS + Prisma)

Упрощённый backend-сервис маркетплейса: продавцы, товары, заказы. Реализован REST API на NestJS, хранение данных в PostgreSQL через Prisma. Swagger-документация доступна из коробки.

## Стек
- Node.js / TypeScript
- NestJS (REST API)
- Prisma ORM
- PostgreSQL (через Docker Compose)
- Swagger (OpenAPI UI)
- Jest (unit-тесты для OrdersService)

## Запуск проекта
1) Установка зависимостей
```bash
npm install
```

2) Настройка окружения
```bash
cp env.example .env
```
По умолчанию `DATABASE_URL` указывает на Postgres из docker-compose:  
`postgresql://postgres:postgres@localhost:5432/marketplace?schema=public`

3) Поднять PostgreSQL в Docker
```bash
docker-compose up -d postgres
```

4) Применить миграции Prisma (сгенерирует и клиент)
```bash
npx prisma migrate dev --name init
```
Если клиент не сгенерировался, дополнительно:
```bash
npx prisma generate
```

5) Запуск приложения
```bash
npm run start:dev   # дев-режим с hot-reload
# или
npm run start       # без hot-reload
```

Swagger UI: http://localhost:3000/swagger  
Основной порт API: `3000`

### Документация
- Swagger UI: `GET /swagger`
- OpenAPI JSON: `GET /swagger-json`

## Упрощения и допущения
- Аутентификация/авторизация отсутствуют.
- Статусы заказа упрощены (`PENDING`, `PAID`, `CANCELLED`); бизнес-правила оплаты не реализованы.
- Цены и суммы хранятся как Decimal; пример в DTO — целые числа в минимальных единицах.
- Проверка стоков и расчёт тотала реализованы базово, без сложных правил резервации.
- Валидация запросов через `class-validator`/`class-transformer`; глобальный `ValidationPipe` и Prisma error filter подключены.
- Docker Compose содержит только Postgres; приложение запускается локально (можно добавить сервис приложения при необходимости).

