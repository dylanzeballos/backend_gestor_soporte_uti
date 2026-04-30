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
    update: {},
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
    update: {},
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