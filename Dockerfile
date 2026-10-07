# Etapa 1 — dependências de build (inclui devDependencies: typescript, tailwind...)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Etapa 2 — build do Next.js
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma Client é gerado no build (não precisa de banco para gerar)
RUN npx prisma generate

# Variáveis públicas necessárias em tempo de build
ARG AUTH_URL
ENV AUTH_URL=$AUTH_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Etapa 3 — runtime enxuto.
# O Next.js em modo standalone já embute as dependências que a aplicação usa,
# então NÃO copiamos node_modules: era ~1 GB de arquivos que dominavam o tempo
# de build e o tamanho da imagem.
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma: schema e migrations ficam disponíveis para consulta/inspeção.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

# ---------------------------------------------------------------------------
# Etapa 4 — ferramentas de banco (migrations e seed).
#
# Mantida separada porque o Prisma CLI precisa de dependências que não fazem
# parte do runtime da aplicação. Use sob demanda, sem afetar o container web:
#
#   docker compose run --rm --build tools npx prisma migrate deploy
#   docker compose run --rm --build tools npx prisma db seed
# ---------------------------------------------------------------------------
FROM node:22-alpine AS tools
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts tsconfig.json ./
COPY prisma ./prisma

CMD ["npx", "prisma", "migrate", "status"]
