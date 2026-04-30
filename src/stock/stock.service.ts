import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async ingresarStock(dto: CreateStockDto) {
    // Generamos un SKU único: P(Producto)-C(Color)-T(Talla)
    const skuBarras = `P${dto.productoId}-C${dto.colorId}-T${dto.tallaId}`;

    // Buscamos si ya existe esta prenda en este almacén específico
    const stockExistente = await this.prisma.stockPrenda.findFirst({
      where: {
        productoId: dto.productoId,
        colorId: dto.colorId,
        tallaId: dto.tallaId,
        almacenId: dto.almacenId
      }
    });

    if (stockExistente) {
      // Si ya existe, actualizamos sumando la cantidad
      return this.prisma.stockPrenda.update({
        where: { id: stockExistente.id },
        data: { cantidad: stockExistente.cantidad + dto.cantidad }
      });
    } else {
      // Si es nuevo, lo creamos con su SKU de barras
      return this.prisma.stockPrenda.create({
        data: {
          skuBarras: skuBarras,
          productoId: dto.productoId,
          colorId: dto.colorId,
          tallaId: dto.tallaId,
          almacenId: dto.almacenId,
          cantidad: dto.cantidad
        }
      });
    }
  }

  async consultarTodo() {
    return this.prisma.stockPrenda.findMany({
      include: { 
        producto: true, 
        color: true, 
        talla: true, 
        almacen: true 
      }
    });
  }
}