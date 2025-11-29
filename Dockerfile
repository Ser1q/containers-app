FROM node:18-bullseye

# netcat for postgres check
RUN apt-get update && apt-get install -y --no-install-recommends netcat && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy package.json, install modules
COPY package.json package-lock.json* ./
RUN npm ci

# copy project
COPY . .

# generating prisma client
RUN npm run prisma:generate

# entry point
RUN chmod +x ./scripts/docker-entrypoint.sh || true

EXPOSE 3000

ENTRYPOINT [ "sh", "./scripts/docker-entrypoint.sh" ]