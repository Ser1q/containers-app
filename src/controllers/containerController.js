const prisma = require('../db/prisma');

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
  // pagination
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // filters (?type, ?status)
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

  if (!container) {
    throw { status: 404, message: 'Container not found' };
  }

  res.json(container);
};

exports.create = async (req, res) => {
  const { number, type, status, zoneId, arrival_time } = req.body;

  // validate required fields
  if (!number || !type || !status) {
    throw { status: 400, message: 'number, type and status are required' };
  }

  // validate enum
  const t = String(type).toUpperCase();
  if (!ALLOWED_CONTAINER_TYPES.includes(t)) {
    throw { status: 400, message: `Invalid type. Allowed: ${ALLOWED_CONTAINER_TYPES.join(', ')}` };
  }

  const s = String(status).toUpperCase();
  if (!ALLOWED_CONTAINER_STATUS.includes(s)) {
    throw { status: 400, message: `Invalid status. Allowed: ${ALLOWED_CONTAINER_STATUS.join(', ')}` };
  }

  // validate zoneId
  let zid = null;
  if (zoneId != null) {
    zid = parseIntOrThrow(zoneId, 'zoneId');
  }

  // validate arrival_time
  let arrival = null;
  if (arrival_time) {
    const d = new Date(arrival_time);
    if (isNaN(d.getTime())) throw { status: 400, message: 'arrival_time must be a valid date' };
    arrival = d;
  }

  const created = await prisma.container.create({
    data: {
      number,
      type: t,
      status: s,
      zoneId: zid,
      arrival_time: arrival
    }
  });

  res.status(201).json(created);
};

exports.update = async (req, res) => {
  const id = parseIntOrThrow(req.params.id, 'id');
  const updates = { ...req.body };

  // normalize arrival_time
  if ('arrival_time' in updates) {
    const d = new Date(updates.arrival_time);
    if (isNaN(d.getTime())) throw { status: 400, message: 'arrival_time must be a valid date' };
    updates.arrival_time = d;
  }

  // validate type
  if ('type' in updates) {
    const t = String(updates.type).toUpperCase();
    if (!ALLOWED_CONTAINER_TYPES.includes(t)) {
      throw { status: 400, message: `Invalid type. Allowed: ${ALLOWED_CONTAINER_TYPES.join(', ')}` };
    }
    updates.type = t;
  }

  // validate status
  if ('status' in updates) {
    const s = String(updates.status).toUpperCase();
    if (!ALLOWED_CONTAINER_STATUS.includes(s)) {
      throw { status: 400, message: `Invalid status. Allowed: ${ALLOWED_CONTAINER_STATUS.join(', ')}` };
    }
    updates.status = s;
  }

  // validate zoneId
  if ('zoneId' in updates) {
    if (updates.zoneId == null) {
      updates.zoneId = null; // detach container from zone
    } else {
      updates.zoneId = parseIntOrThrow(updates.zoneId, 'zoneId');
    }
  }

  const updated = await prisma.container.update({
    where: { id },
    data: updates
  });

  res.json(updated);
};