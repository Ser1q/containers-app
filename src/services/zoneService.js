const prisma = require('../db/prisma');

// retry for deadlock / serialization failure
async function withRetries(fn, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      
      const msg = String(err.message || '').toLowerCase();
      const isTransient =
        msg.includes('could not serialize') ||
        msg.includes('deadlock detected') ||
        msg.includes('canceling statement due to user request') ||
        msg.includes('could not obtain lock');

      if (!isTransient || attempt > maxRetries) throw err;
      await new Promise(r => setTimeout(r, 50 * attempt));
    }
  }
}

async function assignContainerToZone(zoneId, containerId) {
  return withRetries(async () => {
    // use explicit transaction for safety
    return await prisma.$transaction(async (tx) => {
      const container = await tx.container.findUnique({ where: { id: Number(containerId) } });
      if (!container) throw { status: 404, message: 'Container not found' };

      // If already assigned to same zone -> error
      if (container.zoneId === Number(zoneId)) {
        throw { status: 400, message: 'Container already assigned to this zone' };
      }
      // If assigned elsewhere -> prefer explicit unassign/move flow
      if (container.zoneId != null) {
        throw { status: 400, message: 'Container already assigned to another zone. Unassign or move it first.' };
      }

      // container weight (if model has load) otherwise default 1
      const weight = container.load ?? 1;

      // Atomic update on zones table: increment current_load only if capacity allows
      const updatedZones = await tx.$queryRaw`
        UPDATE "zones"
        SET "current_load" = "current_load" + ${weight}
        WHERE id = ${Number(zoneId)} AND ("capacity" - "current_load") >= ${weight}
        RETURNING *;
      `;

      if (!updatedZones || updatedZones.length === 0) {
        // No rows returned -> capacity insufficient
        throw { status: 400, message: 'Zone Overloaded' };
      }

      const updatedZone = updatedZones[0];

      const updatedContainer = await tx.container.update({
        where: { id: container.id },
        data: {
          zoneId: updatedZone.id,
          status: 'LOADED'
        }
      });

      return { zone: updatedZone, container: updatedContainer };
    }, { isolationLevel: 'Serializable' });
  });
}

/**
 * Create a container. If containerData.zoneId is provided, try to atomically reserve capacity in that zone.
 * containerData expected fields: { number, type, status, zoneId?, arrival_time?, load? }
 */
async function createContainerWithOptionalZone(containerData) {
  return withRetries(async () => {
    return await prisma.$transaction(async (tx) => {
      const zid = containerData.zoneId != null ? Number(containerData.zoneId) : null;
      const weight = containerData.load ?? 1;

      let assignedZone = null;
      if (zid != null) {
        // try to reserve capacity atomically
        const updatedZones = await tx.$queryRaw`
          UPDATE "zones"
          SET "current_load" = "current_load" + ${weight}
          WHERE id = ${zid} AND ("capacity" - "current_load") >= ${weight}
          RETURNING *;
        `;
        if (!updatedZones || updatedZones.length === 0) {
          throw { status: 400, message: 'Zone Overloaded' };
        }
        assignedZone = updatedZones[0];
      }

      const created = await tx.container.create({
        data: {
          number: containerData.number,
          type: containerData.type,
          status: containerData.status ?? (assignedZone ? 'LOADED' : 'EMPTY'),
          zoneId: assignedZone ? assignedZone.id : null,
          arrival_time: containerData.arrival_time ?? null,
          load: containerData.load ?? null
        }
      });

      return { zone: assignedZone, container: created };
    }, { isolationLevel: 'Serializable' });
  });
}

/**
 * Ship/unassign a container from its zone:
 * - Decrement zone.current_load (atomically)
 * - Set container.zoneId = null and update status
 */
async function shipContainer(containerId, options = { newStatus: 'IN_TRANSIT' }) {
  return withRetries(async () => {
    return await prisma.$transaction(async (tx) => {
      const container = await tx.container.findUnique({ where: { id: Number(containerId) } });
      if (!container) throw { status: 404, message: 'Container not found' };

      if (container.zoneId == null) {
        throw { status: 400, message: 'Container is not assigned to a zone' };
      }

      const weight = container.load ?? 1;
      const zid = Number(container.zoneId);

      // decrement current_load but ensure current_load >= weight
      const updatedZones = await tx.$queryRaw`
        UPDATE "zones"
        SET "current_load" = "current_load" - ${weight}
        WHERE id = ${zid} AND ("current_load") >= ${weight}
        RETURNING *;
      `;

      if (!updatedZones || updatedZones.length === 0) {
        throw { status: 500, message: 'Zone state inconsistent (cannot decrement), contact admin' };
      }

      const updatedZone = updatedZones[0];

      const updatedContainer = await tx.container.update({
        where: { id: container.id },
        data: {
          zoneId: null,
          status: options.newStatus ?? 'IN_TRANSIT'
        }
      });

      return { zone: updatedZone, container: updatedContainer };
    }, { isolationLevel: 'Serializable' });
  });
}

module.exports = {
  assignContainerToZone,
  createContainerWithOptionalZone,
  shipContainer
};