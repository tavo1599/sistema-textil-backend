#!/usr/bin/env bash
# ============================================================================
# ¿Qué le falta a la base para quedar igual al schema.prisma?
# ============================================================================
# La BD de producción se creó con `db push` y no tiene historial de migraciones,
# así que `migrate deploy` no sirve. Este script usa `migrate diff`, que compara
# una base REAL contra el schema.prisma y escupe el SQL exacto que falta.
#
#   ./scripts/db-diff.sh "postgresql://usuario:pass@host:5432/basededatos"
#
# Sin argumento usa $DATABASE_URL.
#
# ⚠️ LEE EL SQL ANTES DE EJECUTARLO. Si producción tiene tablas o columnas que
#    no están en schema.prisma, el diff incluirá DROPs. Aplica solo las líneas
#    que entiendas y esperes (normalmente, los ADD COLUMN de lo que agregaste).
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

URL="${1:-${DATABASE_URL:-}}"
if [ -z "$URL" ]; then
  echo "❌ Falta la cadena de conexión."
  echo "   Uso: ./scripts/db-diff.sh \"postgresql://...\""
  exit 1
fi

# 🚧 SEGURO: si la conexión apunta a un esquema que no es `public`, el schema.prisma
# no lo declara y el diff propone BORRAR ese esquema entero y recrear todo en
# `public`. Pegar eso destruiría la base. Comprobado en la BD local (textileria).
if echo "$URL" | grep -qiE 'schema=(?!public)[a-z_]' 2>/dev/null || \
   echo "$URL" | grep -qi 'schema=' && ! echo "$URL" | grep -qi 'schema=public'; then
  echo "🚨 PELIGRO: la conexión usa un esquema distinto de 'public'."
  echo "   En ese caso este diff propone DROPear todo y recrearlo en 'public'."
  echo "   NO apliques su salida. Usa 'node scripts/db-smoke.js' para verificar,"
  echo "   y escribe el ALTER TABLE a mano."
  exit 1
fi

echo "🔍 Comparando la base contra prisma/schema.prisma..."
echo "─────────────────────────────────────────────────────"

npx prisma migrate diff \
  --from-url "$URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script

echo "─────────────────────────────────────────────────────"
echo "☝️  Ese es el SQL que le falta a la base."
echo "   Si no salió ninguna sentencia, la base ya está al día."
