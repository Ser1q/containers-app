const prisma = require('../db/prisma');

async function assignContainerToZone(zoneId, containerId) {
  return await prisma.$transaction(async (tx) => {
    const zone = await tx.zone.findUnique({ where: { id: Number(zoneId) } });
    if (!zone) throw { status: 404, message: 'Zone not found' };

    const container = await tx.container.findUnique({ where: { id: Number(containerId) } });
    if (!container) throw { status: 404, message: 'Container not found' };

    if (container.zoneId === zone.id) {
      throw { status: 400, message: 'Container already assigned to this zone' };
    }

    const containerWeight = container.load ?? 1;
    
    
    const available = zone.capacity - zone.current_load;
    if (available < containerWeight) {
      throw { status: 400, message: 'Not enough capacity in zone' };
    }

    const updatedZone = await tx.zone.update({
      where: { id: zone.id },
      data: { current_load: zone.current_load + containerWeight }
    });

    const updatedContainer = await tx.container.update({
      where: { id: container.id },
      data: { zoneId: zone.id, status: 'LOADED' } // по желанию меняем статус
    });

    return { zone: updatedZone, container: updatedContainer };
  }, { isolationLevel: 'Serializable' });
}

module.exports = { assignContainerToZone };