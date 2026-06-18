import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

  // ☁️ CLOUDFLARE R2 (S3-compatible). Se activa con STORAGE_DRIVER=r2 + las variables R2_* del .env.
  private r2Client: S3Client | null = null;

  private getR2Client(): S3Client {
    if (this.r2Client) return this.r2Client;

    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey || !process.env.R2_BUCKET || !process.env.R2_PUBLIC_URL) {
      throw new Error(
        'STORAGE_DRIVER=r2 pero faltan variables. Configura en .env: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL.',
      );
    }

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    return this.r2Client;
  }

  private async escribirR2(carpeta: string, filename: string, data: Buffer, contentType: string): Promise<string> {
    const client = this.getR2Client();
    const key = `${carpeta}/${filename}`;

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );

    // Devolvemos la URL pública (dominio del bucket o dominio personalizado), sin doble barra.
    const base = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
    return `${base}/${key}`;
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
