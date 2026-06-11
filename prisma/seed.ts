import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { description: 'Administrator' },
    create: {
      name: 'admin',
      description: 'Administrator',
    },
  });

  let corporation = await prisma.corporation.findFirst({
    where: { name: 'UMSS' },
  });
  if (!corporation) {
    corporation = await prisma.corporation.create({
      data: { name: 'UMSS' },
    });
  }

  await prisma.user.upsert({
    where: { email: 'uti@umss.edu' },
    update: { password: hashedPassword },
    create: {
      ci: '0000000',
      firstName: 'Admin',
      lastName: 'UTI',
      email: 'uti@umss.edu',
      password: hashedPassword,
      roleId: adminRole.id,
      corporationId: corporation.id,
    },
  });

  const defaultServices = [
    'Soporte de hardware',
    'Soporte de software',
    'Red y conectividad',
    'Correo institucional',
    'Sistema academico',
    'Portal web',
    'Acceso y permisos',
    'Telefonia IP',
    'Aulas virtuales',
    'Impresion y reproduccion',
  ];

  for (const name of defaultServices) {
    await prisma.service.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }
  console.log(`✅ Seeded ${defaultServices.length} default services`);

  console.log('✅ Seed completed: uti@umss.edu / admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });