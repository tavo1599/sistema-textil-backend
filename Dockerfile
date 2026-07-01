
# ============================================
# Multi-stage build para NestJS + Prisma
# ============================================
# ----------- ETAPA 1: BUILD -----------
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar package.json y prisma ANTES de npm ci
COPY package*.json ./
COPY prisma ./prisma

# Instalar todas las dependencias (incluidas dev)
RUN npm ci

# Copiar el resto del código
COPY . .

# Compilar TypeScript a JavaScript
RUN npm run build

# ----------- ETAPA 2: PRODUCCIÓN -----------
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Lima

RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/America/Lima /etc/localtime && \
    echo "America/Lima" > /etc/timezone

# Copiar package.json y prisma ANTES de npm ci
COPY package*.json ./
COPY prisma ./prisma

# Instalar SOLO dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar el código compilado desde builder
COPY --from=builder /app/dist ./dist

# Crear carpeta uploads
RUN mkdir -p uploads/logos

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/main"]