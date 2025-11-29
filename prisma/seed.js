const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Upserting Zones, idempotent like
  const zoneA = await prisma.zone.upsert({
    where: { name: 'Zone A' },
    update: {},
    create: {
      name: 'Zone A',
      capacity: 200,
      current_load: 0,
      type: 'WAREHOUSE' // enum ZoneType
    }
  });

  const zoneB = await prisma.zone.upsert({
    where: { name: 'Zone B' },
    update: {},
    create: {
      name: 'Zone B',
      capacity: 100,
      current_load: 0,
      type: 'TRANSIT'
    }
  });

  // idempotent containers upsert
  await prisma.container.upsert({
    where: { number: 'C-100' },
    update: {},
    create: {
      number: 'C-100',
      type: 'STANDARD',         // enum ContainerType
      status: 'EMPTY',          // enum ContainerStatus
      zoneId: zoneA.id,         // assign to Zone A
      arrival_time: new Date()  // current time
    }
  });

  await prisma.container.upsert({
    where: { number: 'C-101' },
    update: {},
    create: {
      number: 'C-101',
      type: 'REFRIGERATED',
      status: 'LOADED',
      zoneId: zoneB.id,
      arrival_time: new Date()
    }
  });

  // container with no zone
  await prisma.container.upsert({
    where: { number: 'C-102' },
    update: {},
    create: {
      number: 'C-102',
      type: 'HAZARDOUS',
      status: 'IN_TRANSIT',
      zoneId: null,
      arrival_time: new Date()
    }
  });

  console.log('Seed finished.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });