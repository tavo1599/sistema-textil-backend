/**
 * APLICADOR DE CAMBIOS DE BASE DE DATOS
 * ===========================================================================
 * POR QUÉ EXISTE ESTO
 *
 * La base de producción se creó con `prisma db push`, así que NO tiene
 * historial de migraciones y `prisma migrate deploy` no sirve ahí. Además el
 * `prisma` (la herramienta de línea de comandos) es una dependencia de
 * desarrollo: dentro del contenedor de producción no está instalada.
 *
 * El despliegue regeneraba el cliente de Prisma —que ya esperaba columnas
 * nuevas— pero nunca tocaba la base. Resultado: el backend arrancaba pidiendo
 * columnas que no existían y todo se caía con errores como
 *
 *      column Producto.precioMinorista does not exist
 *
 * Este script cierra ese hueco. Corre ANTES de que arranque la API (ver el CMD
 * del Dockerfile) y aplica `prisma/cambios_pendientes.sql`. Así la base SIEMPRE
 * está lista antes de que el primer cliente pida algo, sin que nadie tenga que
 * entrar a pegar SQL en una terminal.
 *
 * CÓMO SE USA
 *   · Automático: lo lanza el contenedor al arrancar. No hay que hacer nada.
 *   · A mano:     npm run db:aplicar
 *   · Sin aplicar nada, solo mirar: npm run db:aplicar -- --revisar
 *
 * SI FALLA, LA API NO ARRANCA (sale con código 1). Es a propósito: es mejor que
 * el contenedor se reinicie que servir una API rota a medias. Como todo el SQL
 * es idempotente, reintentar nunca hace daño.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const ARCHIVO_SQL = path.join(__dirname, 'cambios_pendientes.sql');
const SOLO_REVISAR = process.argv.includes('--revisar');

// Lo que debe existir al terminar. Si algo de esta lista falta, el script falla.
const COLUMNAS_ESPERADAS = [
  ['Producto', 'precioMinorista'],
  ['Producto', 'precioMayorista'],
  ['Producto', 'esMercaderia'],
  ['Producto', 'codigoBarras'],
];
const TABLAS_ESPERADAS = [
  'RolloTela',
  'MovimientoRollo',
  'Transformacion',
  'TransformacionRollo',
  'TransformacionDetalle',
];

// ---------------------------------------------------------------------------
// PARTIR EL ARCHIVO EN SENTENCIAS
// ---------------------------------------------------------------------------
// Un split(';') a lo bruto se rompe con los punto y coma que viven dentro de
// comentarios o de textos entre comillas. Esto recorre el archivo carácter por
// carácter sabiendo cuándo está dentro de un comentario, de un texto ('...') o
// de un nombre entre comillas dobles ("...").
function partirSentencias(sql) {
  // Protección de la regla 4 del .sql: el dollar-quoting ($$ ... $$) de
  // PostgreSQL no se puede partir por punto y coma. Si alguien agrega un
  // bloque DO $$ ... $$, paramos aquí con un mensaje claro en vez de aplicar
  // SQL cortado por la mitad.
  const sinComentarios = sql.replace(/--[^\n]*/g, '');
  if (sinComentarios.includes('$$')) {
    throw new Error(
      'cambios_pendientes.sql contiene un bloque $$ (dollar-quoting). ' +
        'Este ejecutor no los soporta: reescríbelo sin DO $$ ... $$ ' +
        '(las llaves foráneas van dentro del CREATE TABLE, y los índices usan ' +
        'CREATE INDEX IF NOT EXISTS).',
    );
  }

  const sentencias = [];
  let actual = '';
  let enTexto = false;      // dentro de '...'
  let enIdent = false;      // dentro de "..."
  let enComentario = false; // dentro de -- hasta fin de línea
  let enBloque = false;     // dentro de /* ... */

  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const siguiente = sql[i + 1];

    if (enComentario) {
      if (c === '\n') enComentario = false;
      continue;
    }
    if (enBloque) {
      if (c === '*' && siguiente === '/') { enBloque = false; i++; }
      continue;
    }
    if (!enTexto && !enIdent) {
      if (c === '-' && siguiente === '-') { enComentario = true; i++; continue; }
      if (c === '/' && siguiente === '*') { enBloque = true; i++; continue; }
    }

    if (c === "'" && !enIdent) {
      // '' dentro de un texto es una comilla escapada, no el cierre
      if (enTexto && siguiente === "'") { actual += "''"; i++; continue; }
      enTexto = !enTexto;
      actual += c;
      continue;
    }
    if (c === '"' && !enTexto) {
      enIdent = !enIdent;
      actual += c;
      continue;
    }

    if (c === ';' && !enTexto && !enIdent) {
      if (actual.trim()) sentencias.push(actual.trim());
      actual = '';
      continue;
    }

    actual += c;
  }

  if (actual.trim()) sentencias.push(actual.trim());
  return sentencias;
}

/** Resume una sentencia en una línea legible para el log. */
function resumir(sentencia) {
  const limpia = sentencia.replace(/\s+/g, ' ').trim();
  return limpia.length > 88 ? limpia.slice(0, 85) + '...' : limpia;
}

// ---------------------------------------------------------------------------
// ESPERAR A QUE LA BASE RESPONDA
// ---------------------------------------------------------------------------
// En Dokploy el contenedor de la API puede arrancar antes que el de Postgres.
async function esperarBase(db, intentos = 10) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await db.$queryRawUnsafe('SELECT 1');
      return true;
    } catch (e) {
      if (i === intentos) throw e;
      console.log(`   La base aún no responde (intento ${i}/${intentos}), reintentando en 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// ---------------------------------------------------------------------------
// VERIFICACIÓN FINAL
// ---------------------------------------------------------------------------
async function verificar(db) {
  const esquema = await db.$queryRawUnsafe('SELECT current_schema() AS s');
  const nombreEsquema = esquema[0].s;

  const columnas = await db.$queryRawUnsafe(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = $1`,
    nombreEsquema,
  );
  const tablas = await db.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
    nombreEsquema,
  );

  const setColumnas = new Set(columnas.map((c) => `${c.table_name}.${c.column_name}`));
  const setTablas = new Set(tablas.map((t) => t.table_name));

  const faltan = [];
  console.log(`\n🔎 Verificación (esquema "${nombreEsquema}")`);

  for (const [tabla, columna] of COLUMNAS_ESPERADAS) {
    const existe = setColumnas.has(`${tabla}.${columna}`);
    console.log(`   ${existe ? '✅' : '❌'} columna ${tabla}.${columna}`);
    if (!existe) faltan.push(`${tabla}.${columna}`);
  }
  for (const tabla of TABLAS_ESPERADAS) {
    const existe = setTablas.has(tabla);
    console.log(`   ${existe ? '✅' : '❌'} tabla   ${tabla}`);
    if (!existe) faltan.push(tabla);
  }

  return faltan;
}

// ---------------------------------------------------------------------------
// PRINCIPAL
// ---------------------------------------------------------------------------
(async () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  APLICANDO CAMBIOS DE BASE DE DATOS');
  console.log('═══════════════════════════════════════════════════════════');

  if (!fs.existsSync(ARCHIVO_SQL)) {
    console.error(`\n❌ No se encontró ${ARCHIVO_SQL}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(ARCHIVO_SQL, 'utf8');
  let sentencias;
  try {
    sentencias = partirSentencias(sql);
  } catch (e) {
    console.error(`\n❌ ${e.message}`);
    process.exit(1);
  }

  console.log(`\n📄 ${path.basename(ARCHIVO_SQL)}: ${sentencias.length} sentencias\n`);

  const db = new PrismaClient({ log: ['warn', 'error'] });

  try {
    await esperarBase(db);

    if (SOLO_REVISAR) {
      console.log('👀 Modo revisión: NO se aplica nada, solo se verifica el estado actual.');
      const faltan = await verificar(db);
      console.log(
        faltan.length === 0
          ? '\n✅ La base ya tiene todo. No hay nada pendiente.'
          : `\n⚠️  Faltan ${faltan.length}: ${faltan.join(', ')}`,
      );
      await db.$disconnect();
      process.exit(0);
    }

    // Se aplican una por una. Cada sentencia es idempotente, así que si una
    // falla y el contenedor se reinicia, las anteriores no se repiten en vano.
    let aplicadas = 0;
    for (let i = 0; i < sentencias.length; i++) {
      const sentencia = sentencias[i];
      const etiqueta = `[${String(i + 1).padStart(2, '0')}/${sentencias.length}]`;
      try {
        await db.$executeRawUnsafe(sentencia);
        aplicadas++;
        console.log(`   ✅ ${etiqueta} ${resumir(sentencia)}`);
      } catch (e) {
        console.error(`\n   ❌ ${etiqueta} FALLÓ: ${resumir(sentencia)}`);
        console.error(`      ${e.message.split('\n')[0]}`);
        throw e;
      }
    }

    console.log(`\n✅ ${aplicadas} sentencias aplicadas sin error.`);

    const faltan = await verificar(db);
    if (faltan.length > 0) {
      console.error(`\n❌ Después de aplicar todo, siguen faltando: ${faltan.join(', ')}`);
      console.error('   La API NO va a arrancar para no servir datos a medias.');
      await db.$disconnect();
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ BASE DE DATOS LISTA — arrancando la API');
    console.log('═══════════════════════════════════════════════════════════\n');
    await db.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('  ❌ NO SE PUDO PREPARAR LA BASE DE DATOS');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(`  ${e.message}`);
    console.error('\n  La API no va a arrancar. Revisa el log de arriba:');
    console.error('  la sentencia que falló está marcada con ❌.');
    await db.$disconnect().catch(() => {});
    process.exit(1);
  }
})();
