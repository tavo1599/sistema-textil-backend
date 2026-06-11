import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * EmailService — envía correos transaccionales con Resend.
 * Si no hay RESEND_API_KEY configurada, simplemente no envía (no rompe el flujo).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
  private readonly from =
    process.env.RESEND_FROM || 'Essential West <onboarding@resend.dev>';
  private readonly tiendaUrl = process.env.TIENDA_URL || 'http://localhost:3100';

  // Confirmación de pedido al cliente. Nunca lanza error (no debe romper la compra).
  async enviarConfirmacionPedido(pedido: any, config: any) {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY no configurada; no se envió correo.');
      return { enviado: false, motivo: 'sin_api_key' };
    }
    if (!pedido?.email) {
      return { enviado: false, motivo: 'cliente_sin_email' };
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: pedido.email,
        subject: `Tu pedido ${pedido.codigo} — Essential West`,
        html: this.plantillaPedido(pedido, config),
      });
      if (error) {
        this.logger.error(`Resend error: ${JSON.stringify(error)}`);
        return { enviado: false, motivo: 'resend_error', error };
      }
      return { enviado: true, id: data?.id };
    } catch (e: any) {
      this.logger.error(`Fallo al enviar correo: ${e?.message}`);
      return { enviado: false, motivo: 'excepcion' };
    }
  }

  // --- Plantilla HTML (estilo limpio, compatible con clientes de correo) ---
  private plantillaPedido(pedido: any, config: any): string {
    const filas = (pedido.detalles || [])
      .map(
        (d: any) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #EDE9E3;color:#111;font-size:14px;">
            ${d.cantidad}× ${d.nombre}
            <span style="color:#9A8F82;font-size:12px;">(${d.color} / ${d.talla})</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #EDE9E3;color:#111;font-size:14px;text-align:right;">
            S/ ${Number(d.subtotal).toFixed(2)}
          </td>
        </tr>`,
      )
      .join('');

    const desc = Number(pedido.descuento || 0);
    const sub = Number(pedido.subtotal || pedido.total);

    // Datos de pago según método
    let pago = '';
    if (pedido.metodoPago === 'YAPE') pago = `Yape: <b>${config?.yape || '—'}</b>`;
    else if (pedido.metodoPago === 'PLIN') pago = `Plin: <b>${config?.plin || '—'}</b>`;
    else if (pedido.metodoPago === 'TRANSFERENCIA')
      pago = `Transferencia: <b>${config?.cuentaBanco || '—'}</b>${config?.titularCuenta ? ` (${config.titularCuenta})` : ''}`;

    const seguimiento = `${this.tiendaUrl}/seguimiento?codigo=${encodeURIComponent(pedido.codigo)}`;

    return `
    <div style="background:#F7F5F2;padding:32px 0;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #EDE9E3;">
        <div style="padding:28px 32px;border-bottom:1px solid #EDE9E3;text-align:center;">
          <div style="font-size:20px;letter-spacing:4px;color:#111;">ESSENTIAL WEST</div>
        </div>
        <div style="padding:32px;">
          <h1 style="font-size:22px;font-weight:400;color:#111;margin:0 0 6px;">¡Gracias por tu pedido, ${pedido.clienteNombre}!</h1>
          <p style="color:#9A8F82;font-size:14px;margin:0 0 24px;">
            Hemos recibido tu pedido <b style="color:#111;">${pedido.codigo}</b>. Validaremos tu pago y te confirmaremos pronto.
          </p>

          <table style="width:100%;border-collapse:collapse;">${filas}</table>

          <table style="width:100%;border-collapse:collapse;margin-top:14px;font-size:14px;">
            ${desc > 0 ? `<tr><td style="color:#9A8F82;padding:3px 0;">Subtotal</td><td style="text-align:right;color:#111;">S/ ${sub.toFixed(2)}</td></tr>
            <tr><td style="color:#3a9a6a;padding:3px 0;">Descuento${pedido.cuponCodigo ? ' (' + pedido.cuponCodigo + ')' : ''}</td><td style="text-align:right;color:#3a9a6a;">− S/ ${desc.toFixed(2)}</td></tr>` : ''}
            <tr><td style="padding:8px 0 0;color:#111;font-size:16px;">Total</td><td style="text-align:right;padding:8px 0 0;color:#111;font-size:16px;font-weight:bold;">S/ ${Number(pedido.total).toFixed(2)}</td></tr>
          </table>

          ${pago ? `<div style="margin-top:24px;background:#F7F5F2;padding:16px;font-size:14px;color:#111;">
            <div style="color:#9A8F82;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Datos de pago</div>
            ${pago}
          </div>` : ''}

          <div style="margin-top:28px;text-align:center;">
            <a href="${seguimiento}" style="display:inline-block;background:#111;color:#F7F5F2;text-decoration:none;padding:14px 32px;font-size:11px;letter-spacing:2px;text-transform:uppercase;">
              Seguir mi pedido
            </a>
          </div>

          ${config?.whatsapp ? `<p style="color:#9A8F82;font-size:13px;text-align:center;margin-top:20px;">
            ¿Dudas? Escríbenos por WhatsApp: ${config.whatsapp}
          </p>` : ''}
        </div>
        <div style="padding:18px 32px;border-top:1px solid #EDE9E3;text-align:center;color:#9A8F82;font-size:11px;">
          © ${new Date().getFullYear()} ${config?.razonSocial || 'Essential West'}
        </div>
      </div>
    </div>`;
  }
}
