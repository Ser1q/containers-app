const prisma = require('../db/prisma');

module.exports = {
  // Zones
  listZones: () => prisma.zone.findMany({ include: { containers: true } }),
  findZoneById: (id) => prisma.zone.findUnique({ where: { id: Number(id) }, include: { containers: true } }),
  createZone: (data) => prisma.zone.create({ data }),
  updateZone: (id, data, tx) => {
    if (tx) return tx.zone.update({ where: { id: Number(id) }, data });
    return prisma.zone.update({ where: { id: Number(id) }, data });
  },

  // Containers
  listContainers: () => prisma.container.findMany({ include: { zone: true } }),
  findContainerById: (id) => prisma.container.findUnique({ where: { id: Number(id) } }),
  createContainer: (data) => prisma.container.create({ data }),
  updateContainer: (id, data, tx) => {
    if (tx) return tx.container.update({ where: { id: Number(id) }, data });
    return prisma.container.update({ where: { id: Number(id) }, data });
  },

  // access to raw prisma if needed
  prisma
};