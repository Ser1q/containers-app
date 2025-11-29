Containers App — Docker Quickstart Guide

⸻

Требования
    •	Docker
    •	Docker Compose
    •	Git (для клонирования репозитория)

⸻

1. Установка и запуск приложения

Клонируй репозиторий:

git clone <repo-url>
cd containers-app

Запусти приложение и базу:

docker-compose up --build -d

Это поднимет два контейнера:
	•	db — PostgreSQL 15
	•	app — Node.js приложение (Express + Prisma)

⸻

2. Проверить, что всё работает

Логи приложения:

docker-compose logs -f app

Ожидаемые строки:

Postgres is available.
Running prisma generate and migrations...
Starting in development mode (nodemon)...

Проверка API:

curl http://localhost:3000/

Должно вернуть:

{ "ok": true }


⸻

3. Запустить seed (генерация тестовых данных)

Seed выполняется внутри контейнера app:

docker-compose exec app npx prisma db seed

После завершения ты увидишь сводку зон и контейнеров.

⸻

4. Проверка базы данных напрямую (опционально)

Зайти в Postgres контейнера:

docker-compose exec db psql -U postgres -d containersdb

Показать таблицы:

\dt;

Выйти:

\q


⸻

5. API — примеры (curl)
	•	Health:

curl http://localhost:3000/

	•	Создать зону:

curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -d '{"name":"Zone X","capacity":10,"type":"WAREHOUSE"}'

	•	Список зон:

curl http://localhost:3000/api/zones

	•	Создать контейнер (можно с zoneId — сервис попытается зарезервировать место):

curl -X POST http://localhost:3000/api/containers \
  -H "Content-Type: application/json" \
  -d '{"number":"C-1001","type":"STANDARD","status":"EMPTY","zoneId":1}'

	•	Назначить контейнер в зону:

curl -X POST http://localhost:3000/api/zones/1/assign \
  -H "Content-Type: application/json" \
  -d '{"containerId":123}'

	•	Отгрузить (ship) контейнер:

curl -X POST http://localhost:3000/api/containers/123/ship \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_TRANSIT"}'

