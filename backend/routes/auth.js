const express = require('express');
const router = express.Router();
const { generateToken } = require('../middleware/auth');

const USERS = [
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

const SUPER_ADMIN = { id: 'superadmin', name: 'Super Administrator', password: 'super@2024', role: 'superadmin' };

function auditLog(userId, userName, userRole, action, detail) {
  const entry = {
    timestamp: new Date().toISOString(),
    userId: userId,
    userName: userName,
    userRole: userRole,
    action: action,
    detail: detail || ''
  };
  console.log('[AUDIT]', JSON.stringify(entry));
}

router.post('/login', function(req, res) {
  const { userId, password } = req.body;
  if (!userId || !password) {
    auditLog('anonymous', '', '', 'LOGIN_FAILED', 'Missing credentials');
    return res.status(400).json({ error: 'User ID and password are required' });
  }

  if (userId.toLowerCase() === SUPER_ADMIN.id && password === SUPER_ADMIN.password) {
    const token = generateToken(SUPER_ADMIN);
    auditLog(SUPER_ADMIN.id, SUPER_ADMIN.name, SUPER_ADMIN.role, 'LOGIN_SUCCESS', 'Super Admin login');
    return res.json({
      token,
      user: { id: SUPER_ADMIN.id, name: SUPER_ADMIN.name, role: SUPER_ADMIN.role }
    });
  }

  for (const u of USERS) {
    if (u.id === userId && u.password === password) {
      const token = generateToken(u);
      auditLog(u.id, u.name, u.role, 'LOGIN_SUCCESS', 'Admin login');
      return res.json({
        token,
        user: { id: u.id, name: u.name, role: u.role }
      });
    }
  }

  auditLog(userId, '', '', 'LOGIN_FAILED', 'Invalid credentials');
  return res.status(401).json({ error: 'Invalid User ID or Password' });
});

router.get('/users', function(req, res) {
  const allUsers = [SUPER_ADMIN, ...USERS];
  res.json(allUsers.map(u => ({
    id: u.id, name: u.name, role: u.role
  })));
});

module.exports = router;
