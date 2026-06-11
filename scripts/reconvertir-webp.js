/**
 * Reconvierte a WebP todas las imágenes locales ya subidas y actualiza las
 * referencias en la base de datos. Idempotente: salta lo que ya es .webp,
 * videos y archivos que no existen.
 *
 * Uso:  node scripts/reconvertir-webp.js
 */
const { PrismaClient } = require('@prisma/client');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const CWD = process.cwd();
const CALIDAD = Number(process.env.WEBP_QUALITY || 85);
const ANCHO = Number(process.env.IMG_MAX_WIDTH || 2000);

const esImagen = (url) =>
  typeof url === 'string' && /\.(png|jpe?g|gif|bmp|tiff?)$/i.test(url) && !/\.(mp4|webm|ogg|mov|m4v)$/i.test(url);

let convertidas = 0, saltadas = 0, errores = 0;
let ahorroAntes = 0, ahorroDespues = 0;

// Convierte el archivo físico y devuelve la nueva url (o la misma si no aplica)
async function convertir(url) {
  if (!esImagen(url)) { saltadas++; return url; }
  const rutaVieja = path.join(CWD, url.replace(/^\//, ''));
  if (!fs.existsSync(rutaVieja)) { saltadas++; return url; }

  const nuevaUrl = url.replace(/\.[^.]+$/, '.webp');
  const rutaNueva = path.join(CWD, nuevaUrl.replace(/^\//, ''));

  try {
    const tamAntes = fs.statSync(rutaVieja).size;
    await sharp(rutaVieja)
      .rotate()
      .resize({ width: ANCHO, height: ANCHO, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: CALIDAD })
      .toFile(rutaNueva);
    const tamDespues = fs.statSync(rutaNueva).size;

    // Borramos el original (si el nombre cambió)
    if (rutaNueva !== rutaVieja && fs.existsSync(rutaVieja)) fs.unlinkSync(rutaVieja);

    convertidas++;
    ahorroAntes += tamAntes; ahorroDespues += tamDespues;
    console.log(`  ✓ ${path.basename(url)} (${(tamAntes/1024).toFixed(0)}KB) → ${path.basename(nuevaUrl)} (${(tamDespues/1024).toFixed(0)}KB)`);
    return nuevaUrl;
  } catch (e) {
    errores++;
    console.log(`  ✗ Error con ${url}: ${e.message}`);
    return url;
  }
}

async function main() {
  console.log('Reconvirtiendo imágenes a WebP...\n');

  // ProductoImagen.url
  console.log('ProductoImagen:');
  for (const img of await prisma.productoImagen.findMany()) {
    const nueva = await convertir(img.url);
    if (nueva !== img.url) await prisma.productoImagen.update({ where: { id: img.id }, data: { url: nueva } });
  }

  // Producto.imagenLocal / imagenUrl
  console.log('Producto (imagenLocal / imagenUrl):');
  for (const p of await prisma.producto.findMany()) {
    const data = {};
    if (p.imagenLocal) { const n = await convertir(p.imagenLocal); if (n !== p.imagenLocal) data.imagenLocal = n; }
    if (p.imagenUrl)   { const n = await convertir(p.imagenUrl);   if (n !== p.imagenUrl)   data.imagenUrl = n; }
    if (Object.keys(data).length) await prisma.producto.update({ where: { id: p.id }, data });
  }

  // HeroSlide.url (solo imágenes)
  console.log('HeroSlide:');
  for (const s of await prisma.heroSlide.findMany()) {
    const nueva = await convertir(s.url);
    if (nueva !== s.url) await prisma.heroSlide.update({ where: { id: s.id }, data: { url: nueva } });
  }

  // Publicacion.url (solo imágenes; videos se saltan)
  console.log('Publicacion:');
  for (const pub of await prisma.publicacion.findMany()) {
    if (pub.tipo === 'video') { saltadas++; continue; }
    const nueva = await convertir(pub.url);
    if (nueva !== pub.url) await prisma.publicacion.update({ where: { id: pub.id }, data: { url: nueva } });
  }

  // BannerPromo.url
  console.log('BannerPromo:');
  for (const b of await prisma.bannerPromo.findMany()) {
    const nueva = await convertir(b.url);
    if (nueva !== b.url) await prisma.bannerPromo.update({ where: { id: b.id }, data: { url: nueva } });
  }

  // PedidoWeb.voucherUrl
  console.log('PedidoWeb (vouchers):');
  for (const ped of await prisma.pedidoWeb.findMany({ where: { voucherUrl: { not: null } } })) {
    const nueva = await convertir(ped.voucherUrl);
    if (nueva !== ped.voucherUrl) await prisma.pedidoWeb.update({ where: { id: ped.id }, data: { voucherUrl: nueva } });
  }

  console.log(`\nResumen: ${convertidas} convertidas, ${saltadas} saltadas, ${errores} errores.`);
  if (convertidas > 0) {
    console.log(`Espacio: ${(ahorroAntes/1024/1024).toFixed(1)}MB → ${(ahorroDespues/1024/1024).toFixed(1)}MB ` +
      `(ahorro ${(100*(1-ahorroDespues/ahorroAntes)).toFixed(0)}%)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
