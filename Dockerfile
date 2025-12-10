FROM node:20

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости
RUN npm ci

# Генерируем Prisma клиент
RUN npx prisma generate

# Копируем остальные файлы
COPY . .

# Открываем порт
EXPOSE 3000

# Команда по умолчанию (можно переопределить в docker-compose)
CMD ["npm", "run", "start:dev"]
