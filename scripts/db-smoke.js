#!/usr/bin/env node
/* ===========================================================================
 * ¿El cliente de Prisma y la base están de acuerdo?
 * ===========================================================================
 * Recorre TODOS los modelos del cliente de Prisma y hace un findFirst() de
 * cada uno. Si a la base le falta cualquier columna que el cliente espera,
 * Postgres devuelve exactamente el mismo error que rompió producción
 * ("column X does not exist") y este script lo reporta.
 *
 * Es de SOLO LECTURA: no escribe, no altera, no borra nada.
 * Funciona sin importar el esquema (public, textileria...) ni si la base se
 * creó con migraciones o con db push.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." node scripts/db-smoke.js
 *
 * Salida: 0 = todo cuadra · 1 = hay tablas rotas
 *
 * ⚠️ Corre esto contra producción DESPUÉS de cada deploy que toque el
 *    schema.prisma. Si falla, la app está rota aunque el deploy diga "éxito".
 * =========================================================================== */

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({ log: [] });

  // Los modelos son las claves del cliente que exponen findFirst()
  const modelos = Object.keys(prisma)
    .filter((k) => !k.startsWith('_') && !k.startsWith('$'))
    .filter((k) => prisma[k] && typeof prisma[k].findFirst === 'function')
    .sort();

  if (modelos.length === 0) {
    console.error('❌ No se detectaron modelos. ¿Corriste `prisma generate`?');
    process.exit(1);
  }

  console.log(`🔍 Verificando ${modelos.length} tablas contra la base...\n`);

  const rotas = [];

  for (const modelo of modelos) {
    try {
      await prisma[modelo].findFirst();
      console.log(`  ✅ ${modelo}`);
    } catch (error) {
      const mensaje = (error && error.message ? error.message : String(error))
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(-2)
        .join(' | ');
      rotas.push({ modelo, mensaje });
      console.log(`  ❌ ${modelo}`);
    }
  }

  await prisma.$disconnect();

  console.log('\n─────────────────────────────────────────────────────');

  if (rotas.length === 0) {
    console.log('✅ Todas las tablas responden. La base y el cliente están de acuerdo.');
    process.exit(0);
  }

  console.log(`🚨 ${rotas.length} tabla(s) NO coinciden con lo que el cliente espera:\n`);
  for (const r of rotas) {
    console.log(`  • ${r.modelo}`);
    console.log(`    ${r.mensaje}\n`);
  }
  console.log('La app va a fallar en estas tablas. Falta aplicar el cambio de');
  console.log('esquema a la base (ALTER TABLE) antes de que sirva el deploy.');
  process.exit(1);
}

main().catch((e) => {
  console.error('❌ No se pudo conectar a la base:', e.message);
  process.exit(1);
});
