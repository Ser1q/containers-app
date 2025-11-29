set -e

# db host
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-5432}
NODE_ENV=${NODE_ENV:-development}

echo "== Docker entrypoint =="
echo "Waiting for postgres at ${DB_HOST}:${DB_PORT}..."


until nc -z ${DB_HOST} ${DB_PORT}; do
  echo "Waiting for postgres..."
  sleep 1
done

echo "Postgres is available."

# migrations
echo "Running prisma generate (again) and migrations..."
npx prisma generate

npx prisma migrate deploy || {
  echo "prisma migrate deploy failed — if you're developing locally you might want to run 'npx prisma migrate dev' manually."
}

# run
if [ "$NODE_ENV" = "development" ]; then
  echo "Starting in development mode (nodemon)..."
  npm run dev
else
  echo "Starting in production mode..."
  npm run start
fi