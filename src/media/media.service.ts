import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

/**
 * MediaService — guarda archivos subidos optimizando imágenes.
 *
 * - Las IMÁGENES se convierten a WebP de alta calidad (q=85) y se limitan a 2000px,
 *   conservando la calidad visual pero reduciendo el peso un 70-80%.
 * - Los VIDEOS se guardan tal cual (no se recomprimen aquí).
 *
 * Almacenamiento desacoplado por driver:
 *   - 'local' (por defecto): guarda en ./uploads/<carpeta> y sirve por /uploads/...
 *   - 'r2'  (futuro): Cloudflare R2 (S3-compatible). Listo para activar con variables de entorno.
 *
 * Para migrar a la nube SIN tocar el resto del código, solo se configura:
 *   STORAGE_DRIVER=r2
 *   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
 * y se implementa escribirR2() (ver instrucciones abajo).
 */
@Injectable()
export class MediaService {
  private readonly driver = process.env.STORAGE_DRIVER || 'local';
  private readonly calidadWebp = Number(process.env.WEBP_QUALITY || 85);
  private readonly anchoMax = Number(process.env.IMG_MAX_WIDTH || 2000);

  async guardar(file: Express.Multer.File, carpeta: string): Promise<string> {
    if (!file) throw new Error('No se recibió ningún archivo.');

    const esVideo =
      /^video\//.test(file.mimetype || '') ||
      /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.originalname || '');

    const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    if (esVideo) {
      const filename = `${base}${path.extname(file.originalname) || '.mp4'}`;
      return this.escribir(carpeta, filename, file.buffer, this.tipoContenido(filename));
    }

    // Imagen → WebP de alta calidad (mantiene calidad, baja peso)
    const filename = `${base}.webp`;
    const webp = await sharp(file.buffer)
      .rotate() // respeta la orientación de la foto (EXIF)
      .resize({ width: this.anchoMax, height: this.anchoMax, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: this.calidadWebp })
      .toBuffer();

    return this.escribir(carpeta, filename, webp, 'image/webp');
  }

  // ---- Capa de almacenamiento ----
  private async escribir(carpeta: string, filename: string, data: Buffer, contentType: string): Promise<string> {
    if (this.driver === 'r2') {
      return this.escribirR2(carpeta, filename, data, contentType);
    }
    // LOCAL
    const dir = path.join(process.cwd(), 'uploads', carpeta);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), data);
    return `/uploads/${carpeta}/${filename}`;
  }

  // 🔜 CLOUDFLARE R2 (S3-compatible). Para activarlo:
  //   1) npm i @aws-sdk/client-s3
  //   2) Configura en .env: STORAGE_DRIVER=r2, R2_ENDPOINT (https://<accountid>.r2.cloudflarestorage.com),
  //      R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL (dominio público del bucket).
  //   3) Descomenta el bloque de abajo.
  private async escribirR2(carpeta: string, filename: string, data: Buffer, contentType: string): Promise<string> {
    /*
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    const key = `${carpeta}/${filename}`;
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));
    return `${process.env.R2_PUBLIC_URL}/${key}`;
    */
    throw new Error('STORAGE_DRIVER=r2 pero escribirR2() aún no está activado. Sigue las instrucciones en media.service.ts.');
  }

  private tipoContenido(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.mp4' || ext === '.m4v') return 'video/mp4';
    if (ext === '.webm') return 'video/webm';
    if (ext === '.mov') return 'video/quicktime';
    if (ext === '.ogg') return 'video/ogg';
    return 'application/octet-stream';
  }
}
