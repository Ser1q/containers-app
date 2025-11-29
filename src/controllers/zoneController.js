const prisma = require('../db/prisma');
const { assignContainerToZone } = require('../services/zoneService');

// enum values
const ALLOWED_ZONE_TYPES = ['WAREHOUSE', 'TRANSIT', 'STORAGE', 'OTHER'];

// check for int
const parseIntOrThrow = (value, fieldName) => {
  const n = Number(value);
  if (!Number.isInteger(n)) throw { status: 400, message: `${fieldName} must be an integer` };
  return n;
};

exports.list = async (req, res) => {
  // pagination:
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.type) {
    const t = String(req.query.type).toUpperCase();
    if (!ALLOWED_ZONE_TYPES.includes(t)) throw { status: 400, message: `Invalid zone type. Allowed: ${ALLOWED_ZONE_TYPES.join(', ')}` };
    where.type = t;
  }

  const [items, total] = await Promise.all([
    prisma.zone.findMany({
      where,
      include: { containers: true },
      skip,
      take: limit,
      orderBy: { id: 'asc' }
    }),
    prisma.zone.count({ where })
  ]);

  res.json({
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    data: items
  });
};

exports.getById = async (req, res) => {
  const id = parseIntOrThrow(req.params.id, 'id');

  const zone = await prisma.zone.findUnique({
    where: { id },
    include: { containers: true }
  });

  if (!zone) throw { status: 404, message: 'Zone not found' };
  res.json(zone);
};

exports.create = async (req, res) => {
  const { name, capacity, type } = req.body;

  if (!name || capacity == null || !type) {
    throw { status: 400, message: 'name, capacity and type are required' };
  }

  const cap = Number(capacity);
  if (!Number.isInteger(cap) || cap < 0) throw { status: 400, message: 'capacity must be a non-negative integer' };

  const t = String(type).toUpperCase();
  if (!ALLOWED_ZONE_TYPES.includes(t)) throw { status: 400, message: `Invalid zone type. Allowed: ${ALLOWED_ZONE_TYPES.join(', ')}` };

  // create with current_load = 0
  const created = await prisma.zone.create({
    data: {
      name,
      capacity: cap,
      current_load: 0,
      type: t
    }
  });

  res.status(201).json(created);
};

exports.update = async (req, res) => {
  const id = parseIntOrThrow(req.params.id, 'id');
  const updates = { ...req.body };

  // No direct updates to current_load to prevent bypassing business logic.
  if ('current_load' in updates) {
    throw { status: 400, message: 'current_load cannot be modified directly. Use assign/unassign operations.' };
  }

  if ('capacity' in updates) {
    const cap = Number(updates.capacity);
    if (!Number.isInteger(cap) || cap < 0) throw { status: 400, message: 'capacity must be a non-negative integer' };
    updates.capacity = cap;
  }

  if ('type' in updates) {
    const t = String(updates.type).toUpperCase();
    if (!ALLOWED_ZONE_TYPES.includes(t)) throw { status: 400, message: `Invalid zone type. Allowed: ${ALLOWED_ZONE_TYPES.join(', ')}` };
    updates.type = t;
  }

  // Check for unique names
  const updated = await prisma.zone.update({
    where: { id },
    data: updates
  });

  res.json(updated);
};

exports.assignContainer = async (req, res) => {
  const zoneId = parseIntOrThrow(req.params.zoneId, 'zoneId');
  const { containerId } = req.body;
  if (containerId == null) throw { status: 400, message: 'containerId is required in body' };
  const cid = Number(containerId);
  if (!Number.isInteger(cid)) throw { status: 400, message: 'containerId must be an integer' };

  // heavy logic to service
  const result = await assignContainerToZone(zoneId, cid);
  res.json(result);
};