FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY packages/server/package.json packages/server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 9090

CMD ["pnpm", "--filter", "server", "dev"]
