const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('superadmin'));

let USERS = [
  { id: '201760', name: 'LAV SREY NET', password: 'admin123', role: 'admin' },
  { id: '13177', name: 'IN SOPHOAN', password: 'admin123', role: 'admin' },
  { id: '201578', name: 'KING ROTH MONY', password: 'admin123', role: 'admin' },
  { id: '1005', name: 'KAO VANNAK', password: 'admin123', role: 'admin' },
  { id: '1006', name: 'HOU PHALKUN', password: 'admin123', role: 'admin' },
  { id: '1019', name: 'VUN SOPHATH', password: 'admin123', role: 'admin' },
  { id: '2002', name: 'TINA MARIE ESTIOKO', password: 'admin123', role: 'admin' },
  { id: '201580', name: 'CHAN THEA', password: 'admin123', role: 'admin' },
  { id: '240256', name: 'CHAN SAMBATH', password: 'admin123', role: 'admin' },
  { id: '201674', name: 'LY BUNTHOEUN', password: 'admin123', role: 'admin' }
];

const SUPER_ADMIN = { id: 'superadmin', name: 'Super Administrator', password: 'super@2026', role: 'superadmin' };

router.get('/', function(req, res) {
  const allUsers = [SUPER_ADMIN, ...USERS];
  res.json(allUsers.map(u => ({
    id: u.id, name: u.name, role: u.role
  })));
});

router.post('/', function(req, res) {
  const { id, name, password, role } = req.body;
  if (!id || !name || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (id === SUPER_ADMIN.id) {
    return res.status(400).json({ error: 'Cannot create another super admin with that ID' });
  }
  for (const u of USERS) {
    if (u.id === id) {
      return res.status(400).json({ error: 'User ID already exists' });
    }
  }
  USERS.push({ id, name: name.toUpperCase(), password, role });
  res.status(201).json({ id, name: name.toUpperCase(), role });
});

router.put('/:id', function(req, res) {
  const { id: newId, name, password, role } = req.body;
  if (req.params.id === SUPER_ADMIN.id) {
    SUPER_ADMIN.name = name || SUPER_ADMIN.name;
    SUPER_ADMIN.password = password || SUPER_ADMIN.password;
    SUPER_ADMIN.role = role || SUPER_ADMIN.role;
    return res.json({ id: SUPER_ADMIN.id, name: SUPER_ADMIN.name, role: SUPER_ADMIN.role });
  }
  for (const u of USERS) {
    if (u.id === req.params.id) {
      u.name = (name || u.name).toUpperCase();
      if (password) u.password = password;
      u.role = role || u.role;
      return res.json({ id: u.id, name: u.name, role: u.role });
    }
  }
  return res.status(404).json({ error: 'User not found' });
});

router.delete('/:id', function(req, res) {
  if (req.params.id === SUPER_ADMIN.id) {
    return res.status(400).json({ error: 'Cannot delete the Super Admin account' });
  }
  for (let i = 0; i < USERS.length; i++) {
    if (USERS[i].id === req.params.id) {
      USERS.splice(i, 1);
      return res.json({ success: true });
    }
  }
  return res.status(404).json({ error: 'User not found' });
});

module.exports = router;
