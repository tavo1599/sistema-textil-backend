import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHashed = await bcrypt.hash('admin123', 10);
  await prisma.usuario.upsert({
    where: { email: 'admin@moditex.com' },
    update: {},
    create: {
      email: 'admin@moditex.com',
      nombre: 'Admin Moditex',
      password: passwordHashed,
      rol: 'ADMIN',
    },
  });
  console.log('✅ Usuario ADMIN creado: admin@moditex.com / admin123');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());