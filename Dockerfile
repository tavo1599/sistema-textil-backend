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

# ✅ CAMBIO: Usar npx tsc directamente
RUN npx tsc -p tsconfig.build.json
RUN ls -la dist/ || echo "No dist folder!"

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

# Scripts de diagnóstico de base de datos (db:smoke, db:revisar).
# Sin esto, `npm run db:smoke` no existe dentro del contenedor y no hay forma
# de revisar si la base y el cliente de Prisma están de acuerdo.
COPY scripts ./scripts

# Crear carpeta uploads
RUN mkdir -p uploads/logos

EXPOSE 3000

# Healthcheck con Node (el wget de BusyBox/alpine no soporta --spider/--no-verbose
# y hacía fallar el chequeo → el contenedor quedaba "unhealthy" y lo mataban).
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

# Al arrancar: PRIMERO se prepara la base, DESPUÉS arranca la API.
# Este orden es lo que evita el error "column X does not exist": el cliente de
# Prisma nunca consulta una columna antes de que exista. Si la preparación
# falla, el `&&` corta y la API no arranca (mejor reiniciar que servir roto).
CMD ["sh", "-c", "node prisma/aplicar-cambios.js && node dist/src/main"]