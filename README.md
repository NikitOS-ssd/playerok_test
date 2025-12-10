# Marketplace Backend (NestJS + Prisma + Observability)

Упрощённый backend-сервис маркетплейса: продавцы, товары, заказы. Реализован REST API на NestJS, хранение данных в PostgreSQL через Prisma. Включает полную экосистему мониторинга: Prometheus для метрик, Grafana для визуализации, Loki + Promtail для логов.

## Стек

### Приложение
- Node.js 20 / TypeScript
- NestJS (REST API)
- Prisma ORM
- PostgreSQL 15
- Swagger (OpenAPI UI)
- Jest (unit-тесты)

### Мониторинг и Observability
- **Prometheus** — сбор метрик
- **Grafana** — визуализация метрик и логов
- **Loki** — агрегация логов
- **Promtail** — сбор логов из Docker-контейнеров
- **@willsoto/nestjs-prometheus** — экспорт метрик из NestJS

## Быстрый старт (Docker Compose)

Рекомендуемый способ развёртки — через Docker Compose со всей экосистемой мониторинга:

```bash
# 1. Клонируйте репозиторий (если нужно)
git clone <repository-url>
cd playerok_test

# 2. Запустите все сервисы
docker compose up -d

# 3. Дождитесь запуска всех контейнеров (особенно backend)
docker compose logs -f backend
```

После запуска будут доступны:

- **API**: http://localhost:3000
- **Swagger UI**: http://localhost:3000/swagger
- **Grafana**: http://localhost:3005 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100
- **Promtail**: http://localhost:9080

### Что происходит при запуске

1. **PostgreSQL** поднимается с healthcheck
2. **Backend** ждёт готовности PostgreSQL, затем:
   - Автоматически применяет миграции Prisma (`prisma migrate deploy`)
   - Запускает NestJS приложение в dev-режиме
3. **Prometheus** начинает собирать метрики с backend каждые 5 секунд
4. **Loki** готов к приёму логов
5. **Promtail** собирает логи из Docker-контейнеров и отправляет в Loki
6. **Grafana** автоматически подключает datasources (Prometheus, Loki) и загружает дэшборд

## Локальный запуск (без Docker)

Альтернативный способ для разработки:

```bash
# 1. Установка зависимостей
npm install

# 2. Настройка окружения
cp env.example .env
# По умолчанию DATABASE_URL: postgresql://postgres:postgres@localhost:5432/marketplace?schema=public

# 3. Поднять только PostgreSQL
docker compose up -d postgres

# 4. Применить миграции
npx prisma migrate dev
npx prisma generate

# 5. Запуск приложения
npm run start:dev   # dev-режим с hot-reload
# или
npm run start       # production-режим
```

## Мониторинг и метрики

### Prometheus метрики

Приложение автоматически экспортирует метрики на `/metrics`:

**HTTP метрики:**
- `http_requests_total` — общее количество HTTP-запросов (лейблы: `method`, `route`, `status_code`)
- `http_request_duration_seconds` — длительность запросов (histogram с перцентилями)

**Системные метрики (из prom-client defaultMetrics):**
- `process_cpu_seconds_total` — использование CPU
- `process_resident_memory_bytes` — резидентная память
- `nodejs_heap_size_*` — метрики heap памяти Node.js
- `nodejs_eventloop_lag_seconds` — задержка event loop
- И другие стандартные метрики Node.js процесса

**Проверка метрик:**
```bash
# С хоста
curl http://localhost:3000/metrics

# Из контейнера Prometheus
docker exec prometheus wget -qO- http://marketplace-backend:3000/metrics
```

### Grafana дэшборд

Автоматически загружается дэшборд **"PlayerOK Observability"** с панелями:

- **HTTP RPS** — запросов в секунду
- **HTTP Error Rate** — процент ошибок 5xx
- **HTTP Latency** — p95 и p99 перцентили задержек
- **CPU Usage** — использование CPU процессом
- **Memory Usage** — резидентная память
- **PostgreSQL метрики** — размер БД, активные соединения (если настроен exporter)
- **Логи из Loki** — все логи и фильтр по ERROR

**Доступ:** http://localhost:3005 (логин: `admin`, пароль: `admin`)

### Prometheus UI

**Доступ:** http://localhost:9090

**Полезные PromQL запросы:**
```promql
# Общее количество запросов
http_requests_total

# RPS по методам и маршрутам
sum(rate(http_requests_total[5m])) by (method, route)

# Error rate
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Latency p95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# CPU usage
rate(process_cpu_seconds_total[5m]) * 100
```

## Логи

Логи собираются автоматически через Promtail из всех Docker-контейнеров и отправляются в Loki.

**Просмотр логов:**
- В Grafana: панель "Backend logs (Loki)" в дэшборде
- Через Loki API: http://localhost:3100
- Через Docker: `docker compose logs -f backend`

**Фильтрация ERROR логов:**
- В Grafana: панель "Backend ERROR logs (Loki)"

## Структура проекта

```
.
├── src/                          # Исходный код NestJS
│   ├── modules/                 # Модули приложения (sellers, products, orders)
│   ├── common/                  # Общие компоненты
│   │   ├── interceptors/       # MetricsInterceptor для Prometheus
│   │   └── filters/            # Exception filters
│   ├── monitoring/              # MonitoringModule с PrometheusModule
│   └── prisma/                 # PrismaService и модуль
├── prisma/                      # Prisma схема и миграции
│   └── migrations/
├── grafana/                     # Конфигурация Grafana
│   ├── datasources.yaml        # Автоматическая настройка Prometheus и Loki
│   ├── dashboards.yaml         # Provisioning дэшбордов
│   └── dashboard.json          # Дэшборд "PlayerOK Observability"
├── docker-compose.yml          # Все сервисы: backend, postgres, prometheus, grafana, loki, promtail
├── Dockerfile                  # Dockerfile для backend
├── prometheus.yml              # Конфигурация Prometheus (scrape configs)
├── loki-config.yaml            # Конфигурация Loki
└── promtail-config.yml         # Конфигурация Promtail
```

## API документация

- **Swagger UI**: http://localhost:3000/swagger
- **OpenAPI JSON**: http://localhost:3000/swagger-json

## Управление контейнерами

```bash
# Запуск всех сервисов
docker compose up -d

# Остановка всех сервисов
docker compose down

# Пересборка и перезапуск backend
docker compose build backend
docker compose up -d --force-recreate backend

# Просмотр логов
docker compose logs -f backend
docker compose logs -f prometheus
docker compose logs -f grafana

# Остановка с удалением volumes (⚠️ удалит данные БД)
docker compose down -v
```

## Разработка

### Hot-reload

При запуске через Docker Compose backend работает в dev-режиме с hot-reload благодаря volume mount:
```yaml
volumes:
  - ./:/app
  - /app/node_modules  # Исключает node_modules из mount
```

Изменения в коде автоматически применяются без пересборки контейнера.

### Prisma миграции

Миграции применяются автоматически при запуске контейнера через команду:
```yaml
command: sh -c "npx prisma migrate deploy && npm run start:dev"
```

Для создания новых миграций локально:
```bash
npx prisma migrate dev --name <migration_name>
```

### Тестирование

```bash
npm test
```

## Упрощения и допущения

- Аутентификация/авторизация отсутствуют
- Статусы заказа упрощены (`PENDING`, `PAID`, `CANCELLED`); бизнес-правила оплаты не реализованы
- Цены и суммы хранятся как Decimal; пример в DTO — целые числа в минимальных единицах
- Проверка стоков и расчёт тотала реализованы базово, без сложных правил резервации
- Валидация запросов через `class-validator`/`class-transformer`; глобальный `ValidationPipe` и Prisma error filter подключены
- Postgres exporter не настроен (метрики PostgreSQL в дэшборде могут быть недоступны без дополнительной настройки)

