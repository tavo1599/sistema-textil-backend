import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// 🚨 IMPORTANTE: cors: { origin: '*' } permite que tu frontend en Vue se conecte sin bloqueos
@WebSocketGateway({
  cors: {
    origin: '*', // Permite que cualquier IP se conecte
    methods: ['GET', 'POST'],
  },
})
export class ScannerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  
  @WebSocketServer()
  server: Server;

  // Se ejecuta cuando CUALQUIER dispositivo (Laptop o Móvil) se conecta
  handleConnection(client: Socket) {
    console.log(`🟢 Cliente conectado: ${client.id}`);
  }

  // 🔥 SE EJECUTA SOLA CUANDO EL CELULAR PIERDE CONEXIÓN O SE CIERRA LA PESTAÑA
  handleDisconnect(client: Socket) {
    const pin = client.data.pin;
    if (pin) {
      // Si el que se fue era el móvil, avisamos a la laptop de su sala
      this.server.to(pin).emit('movil-desconectado', { status: 'offline' });
    }
    console.log(`🔴 Cliente fuera: ${client.id}`);
  }

  // ========================================================
  // 1. LA LAPTOP CREA LA "SALA" (CON SU PIN)
  // ========================================================
  @SubscribeMessage('crear-sala')
  handleCrearSala(@MessageBody() data: { pin: string }, @ConnectedSocket() client: Socket) {
    // client.join() mete a la laptop en un "cuarto privado" con el nombre del PIN
    client.join(data.pin);
    console.log(`💻 Laptop (${client.id}) creó y se unió a la sala PIN: ${data.pin}`);
    return { event: 'sala-creada', data: { status: 'ok', pin: data.pin } };
  }

  // ========================================================
  // 2. EL MÓVIL SE UNE A LA SALA (USANDO EL PIN)
  // ========================================================
  @SubscribeMessage('unirse-sala')
  handleUnirseSala(@MessageBody() data: { pin: string }, @ConnectedSocket() client: Socket) {
    client.join(data.pin);
    
    // 🔥 ¡LÍNEA CLAVE AÑADIDA! 🔥
    // Guardamos el PIN en la "memoria" de este socket para recordarlo cuando se desconecte
    client.data.pin = data.pin; 

    console.log(`📱 Móvil (${client.id}) se unió a la sala PIN: ${data.pin}`);
    
    // Le avisamos a la Laptop (y a todos en la sala) que el móvil ya entró
    this.server.to(data.pin).emit('movil-conectado', { 
      status: 'success', 
      mensaje: 'Escáner vinculado correctamente' 
    });
  }

  // ========================================================
  // 3. EL MÓVIL ENVÍA EL CÓDIGO ESCANEADO
  // ========================================================
  @SubscribeMessage('enviar-codigo')
  handleEnviarCodigo(@MessageBody() data: { pin: string; codigo: string }, @ConnectedSocket() client: Socket) {
    console.log(`📷 Código [${data.codigo}] recibido en sala PIN: ${data.pin}`);
    
    // El Gateway toma el código y se lo "escupe" SOLO a la laptop que está en esa sala
    this.server.to(data.pin).emit('codigo-recibido', { 
      codigo: data.codigo,
      timestamp: new Date().toISOString()
    });
  }

  // ========================================================
  // 4. LA LAPTOP LE AVISA AL MÓVIL CÓMO VA EL CARRITO
  // ========================================================
  @SubscribeMessage('sincronizar-carrito')
  handleSincronizarCarrito(@MessageBody() data: { pin: string; carrito: any[] }) {
    // Reenviamos la lista de productos a todos en la sala (al móvil)
    this.server.to(data.pin).emit('carrito-actualizado', data.carrito);
  }
}