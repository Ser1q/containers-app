const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();

exports.list = async (req, res) => {
  const containers = await client.container.findMany({ include: { zone: true } });
  res.json(containers);
};

exports.getById = async (req, res) => {
  const id = Number(req.params.id);
  const c = await client.container.findUnique({ where: { id } });
  if (!c) return res.status(404).json({ message: 'Not found' });
  res.json(c);
};

exports.create = async (req, res) => {
  const { number, type, status, zoneId, arrival_time } = req.body;
  if (!number || !type || !status) return res.status(400).json({ message: 'number, type and status required' });

  const data = {
    number,
    type,
    status,
    zoneId: zoneId || null,
    arrival_time: arrival_time ? new Date(arrival_time) : null
  };

  const created = await client.container.create({ data });
  res.status(201).json(created);
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const updates = req.body;
  
  if (updates.arrival_time) updates.arrival_time = new Date(updates.arrival_time);
  const updated = await client.container.update({ where: { id }, data: updates });
  res.json(updated);
};