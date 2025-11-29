// src/controllers/containerController.js
const prisma = require('../db/prisma');
const { createContainerWithOptionalZone, shipContainer } = require('../services/zoneService');

// enum values
const ALLOWED_CONTAINER_TYPES = ['STANDARD', 'REFRIGERATED', 'HAZARDOUS', 'OTHER'];
const ALLOWED_CONTAINER_STATUS = ['EMPTY', 'LOADED', 'IN_TRANSIT', 'MAINTENANCE', 'OTHER'];

// check for int
const parseIntOrThrow = (value, fieldName) => {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw { status: 400, message: `${fieldName} must be an integer` };
  }
  return n;
};

exports.list = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.type) {
    const t = String(req.query.type).toUpperCase();
    if (!ALLOWED_CONTAINER_TYPES.includes(t)) {
      throw { status: 400, message: `Invalid container type. Allowed: ${ALLOWED_CONTAINER_TYPES.join(', ')}` };
    }
    where.type = t;
  }

  if (req.query.status) {
    const s = String(req.query.status).toUpperCase();
    if (!ALLOWED_CONTAINER_STATUS.includes(s)) {
      throw { status: 400, message: `Invalid status. Allowed: ${ALLOWED_CONTAINER_STATUS.join(', ')}` };
    }
    where.status = s;
  }

  const [items, total] = await Promise.all([
    prisma.container.findMany({
      where,
      include: { zone: true },
      skip,
      take: limit,
      orderBy: { id: 'asc' }
    }),
    prisma.container.count({ where })
  ]);

  res.json({
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
    data: items
  });
};

exports.getById = async (req, res) => {
  const id = parseIntOrThrow(req.params.id, 'id');

  const container = await prisma.container.findUnique({
    where: { id },
    include: { zone: true }
  });

  if (!container) throw { status: 404, message: 'Container not found' };
  res.json(container);
};

/**
 * Creating container through service
 * - for zoneId service will try to reserve atomically
 * - returns { zone, container }
 */
exports.create = async (req, res) => {
  const { number, type, status, zoneId, arrival_time, load } = req.body;

  if (!number || !type || !status) throw { status: 400, message: 'number, type and status are required' };

  const t = String(type).toUpperCase();
  if (!ALLOWED_CONTAINER_TYPES.includes(t)) {
    throw { status: 400, message: `Invalid type. Allowed: ${ALLOWED_CONTAINER_TYPES.join(', ')}`}; 
  }

  const s = String(status).toUpperCase();
  if (!ALLOWED_CONTAINER_STATUS.includes(s)) {
    throw { status: 400, message: `Invalid status. Allowed: ${ALLOWED_CONTAINER_STATUS.join(', ')}`};
  }

  let zid = null;
  if (zoneId != null) zid = parseIntOrThrow(zoneId, 'zoneId');

  let arrival = null;
  if (arrival_time) {
    const d = new Date(arrival_time);
    if (isNaN(d.getTime())) throw { status: 400, message: 'arrival_time must be a valid date' };
    arrival = d;
  }

  // service handels atomic reservation
  const result = await createContainerWithOptionalZone({
    number,
    type: t,
    status: s,
    zoneId: zid,
    arrival_time: arrival,
    load: load != null ? Number(load) : undefined
  });

  res.status(201).json(result);
};


exports.update = async (req, res) => {
  const id = parseIntOrThrow(req.params.id, 'id');
  const updates = { ...req.body };

  if ('arrival_time' in updates) {
    const d = new Date(updates.arrival_time);
    if (isNaN(d.getTime())) throw { status: 400, message: 'arrival_time must be a valid date' };
    updates.arrival_time = d;
  }

  if ('type' in updates) {
    const t = String(updates.type).toUpperCase();
    if (!ALLOWED_CONTAINER_TYPES.includes(t)) throw { status: 400, message: `Invalid type. Allowed: ${ALLOWED_CONTAINER_TYPES.join(', ')}` };
    updates.type = t;
  }

  if ('status' in updates) {
    const s = String(updates.status).toUpperCase();
    if (!ALLOWED_CONTAINER_STATUS.includes(s)) throw { status: 400, message: `Invalid status. Allowed: ${ALLOWED_CONTAINER_STATUS.join(', ')}` };
    updates.status = s;
  }

  if ('zoneId' in updates) {
    if (updates.zoneId == null) {
      updates.zoneId = null; // detach
    } else {
      updates.zoneId = parseIntOrThrow(updates.zoneId, 'zoneId');
    }
  }

  if ('load' in updates) {
    updates.load = Number(updates.load);
  }

  const updated = await prisma.container.update({
    where: { id },
    data: updates
  });

  res.json(updated);
};

/**
 * handler: ship/unassign of container
 * POST /api/containers/:id/ship
 */
exports.ship = async (req, res) => {
  const id = parseIntOrThrow(req.params.id, 'id');
  const newStatus = req.body.status || 'IN_TRANSIT';
  const result = await shipContainer(id, { newStatus });
  res.json(result);
};