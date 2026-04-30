import { Injectable } from '@nestjs/common';
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfService {
  
  async generarGuiaRemision(datos: any): Promise<Buffer> {
    const pdfBuffer: Buffer = await new Promise((resolve) => {
      // Recuerda usar el require que configuramos antes
      const PDFDocument = require('pdfkit');
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      // --- ENCABEZADO ---
      doc.rect(0, 0, doc.page.width, 100).fill('#f2f2f2'); 
      doc.fillColor('#000').fontSize(20).text('MODITEX - GUÍA DE REMISIÓN', 50, 40);
      doc.fontSize(10).text(`Nro: ${datos.numeroGuia}`, 400, 45);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 400, 60);

      // --- DATOS DEL TALLER ---
      doc.moveDown(4);
      doc.fontSize(12).font('Helvetica-Bold').text('DESTINATARIO:');
      doc.font('Helvetica').fontSize(10).text(`Nombre: ${datos.tallerNombre}`);
      doc.text(`Dirección: ${datos.tallerDireccion}`);
      doc.moveDown();

      // --- TABLA DE PRENDAS (Con Talla) ---
      const tableTop = 250;
      doc.font('Helvetica-Bold');
      doc.text('CANT', 50, tableTop);
      doc.text('DESCRIPCIÓN', 110, tableTop);
      doc.text('TALLA', 350, tableTop); // Nueva Columna
      doc.text('SKU', 420, tableTop);
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // --- RECORRER PRENDAS Y SUMAR ---
      doc.font('Helvetica');
      let rowTop = tableTop + 30;
      let totalPrendas = 0; // Iniciamos la calculadora en 0

      datos.prendas.forEach((p) => {
        doc.text(p.cantidad.toString(), 50, rowTop);
        doc.text(p.nombre, 110, rowTop);
        doc.text(p.talla, 350, rowTop);
        doc.text(p.sku, 420, rowTop);
        
        totalPrendas += p.cantidad; // Vamos sumando la cantidad
        rowTop += 20;
      });

      // --- FILA DE TOTALES ---
      doc.moveTo(50, rowTop).lineTo(550, rowTop).stroke(); // Línea separadora
      rowTop += 10;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('TOTAL DE PRENDAS:', 110, rowTop);
      doc.text(totalPrendas.toString(), 50, rowTop); // Imprime "150" debajo de la columna CANT
      doc.font('Helvetica').fontSize(10); // Regresamos la fuente a la normalidad

      // --- FIRMAS ---
      doc.moveTo(100, 700).lineTo(250, 700).stroke();
      doc.text('Firma Despacho', 130, 710);

      doc.moveTo(350, 700).lineTo(500, 700).stroke();
      doc.text('Firma Recepción', 380, 710);

      const chunks: any[] = []; // Usamos tu arreglo corregido
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.end();
    });

    return pdfBuffer;
  }
}