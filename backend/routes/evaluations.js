const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

const admin = require('firebase-admin');
let db, evaluationsRef;
function ensureFirebase() {
  if (!db) {
    if (admin.apps.length === 0) throw new Error('Firebase not initialized');
    db = admin.firestore();
    evaluationsRef = db.collection('evaluations');
  }
}

router.use(verifyToken);

function auditLog(user, action, detail) {
  const entry = {
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: action,
    detail: detail || ''
  };
  console.log('[AUDIT]', JSON.stringify(entry));
}

function getEvalQuery(user) {
  const query = (user.role === 'superadmin')
    ? evaluationsRef.orderBy('timestamp', 'asc')
    : evaluationsRef
        .where('createdById', '==', user.id)
        .orderBy('timestamp', 'asc');
  auditLog(user, 'QUERY', 'Fetching evaluations list');
  return query;
}

router.get('/', async function(req, res) {
  try { ensureFirebase(); } catch(e) { return res.status(503).json({ error: 'Database not available' }); }
  try {
    const query = getEvalQuery(req.user);
    const snapshot = await query.get();
    const results = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data._id = doc.id;
      results.push(data);
    });
    auditLog(req.user, 'LIST', `Returned ${results.length} evaluations`);
    res.json(results);
  } catch (err) {
    console.error('Error fetching evaluations:', err);
    res.status(500).json({ error: 'Failed to fetch evaluations' });
  }
});

router.get('/:id', async function(req, res) {
  try { ensureFirebase(); } catch(e) { return res.status(503).json({ error: 'Database not available' }); }
  try {
    const doc = await evaluationsRef.doc(req.params.id).get();
    if (!doc.exists) {
      auditLog(req.user, 'READ_DENIED', `Evaluation ${req.params.id} not found`);
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    const data = doc.data();
    if (req.user.role !== 'superadmin' && data.createdById !== req.user.id) {
      auditLog(req.user, 'READ_DENIED', `Evaluation ${req.params.id} owned by ${data.createdById}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    data._id = doc.id;
    auditLog(req.user, 'READ', `Evaluation ${req.params.id} (${data.employeeName})`);
    res.json(data);
  } catch (err) {
    console.error('Error fetching evaluation:', err);
    res.status(500).json({ error: 'Failed to fetch evaluation' });
  }
});

router.post('/', async function(req, res) {
  try { ensureFirebase(); } catch(e) { return res.status(503).json({ error: 'Database not available' }); }
  try {
    const data = req.body;
    const entry = {
      employeeName: data.employeeName || '',
      employeeId: data.employeeId || '',
      position: data.position || '',
      hiredDate: data.hiredDate || '',
      campus: data.campus || '',
      gender: data.gender || '',
      appraiser: data.appraiser || '',
      reviewDate: data.reviewDate || '',
      criteria: data.criteria || [],
      superScores: data.superScores || [],
      totalSelf: parseFloat(data.totalSelf) || 0,
      totalSuper: parseFloat(data.totalSuper) || 0,
      overallScore: parseFloat(data.overallScore) || 0,
      timestamp: new Date().toISOString(),
      createdById: req.user.id,
      createdByName: req.user.name
    };
    const docRef = await evaluationsRef.add(entry);
    entry._id = docRef.id;
    auditLog(req.user, 'CREATE', `Evaluation ${docRef.id} for ${entry.employeeName}`);
    res.status(201).json(entry);
  } catch (err) {
    console.error('Error creating evaluation:', err);
    res.status(500).json({ error: 'Failed to create evaluation' });
  }
});

router.put('/:id', async function(req, res) {
  try { ensureFirebase(); } catch(e) { return res.status(503).json({ error: 'Database not available' }); }
  try {
    const doc = await evaluationsRef.doc(req.params.id).get();
    if (!doc.exists) {
      auditLog(req.user, 'UPDATE_DENIED', `Evaluation ${req.params.id} not found`);
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    const existing = doc.data();
    if (req.user.role !== 'superadmin' && existing.createdById !== req.user.id) {
      auditLog(req.user, 'UPDATE_DENIED', `Evaluation ${req.params.id} owned by ${existing.createdById}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    const data = req.body;
    const update = {
      employeeName: data.employeeName || existing.employeeName,
      employeeId: data.employeeId || existing.employeeId,
      position: data.position || existing.position,
      hiredDate: data.hiredDate || existing.hiredDate,
      campus: data.campus || existing.campus,
      gender: data.gender || existing.gender,
      appraiser: data.appraiser || existing.appraiser,
      reviewDate: data.reviewDate || existing.reviewDate,
      criteria: data.criteria || existing.criteria,
      superScores: data.superScores || existing.superScores,
      totalSelf: parseFloat(data.totalSelf) || existing.totalSelf,
      totalSuper: parseFloat(data.totalSuper) || existing.totalSuper,
      overallScore: parseFloat(data.overallScore) || existing.overallScore
    };
    await evaluationsRef.doc(req.params.id).update(update);
    update._id = req.params.id;
    update.timestamp = existing.timestamp;
    update.createdById = existing.createdById;
    update.createdByName = existing.createdByName;
    auditLog(req.user, 'UPDATE', `Evaluation ${req.params.id} (${existing.employeeName})`);
    res.json(update);
  } catch (err) {
    console.error('Error updating evaluation:', err);
    res.status(500).json({ error: 'Failed to update evaluation' });
  }
});

router.delete('/:id', async function(req, res) {
  try { ensureFirebase(); } catch(e) { return res.status(503).json({ error: 'Database not available' }); }
  try {
    const doc = await evaluationsRef.doc(req.params.id).get();
    if (!doc.exists) {
      auditLog(req.user, 'DELETE_DENIED', `Evaluation ${req.params.id} not found`);
      return res.status(404).json({ error: 'Evaluation not found' });
    }
    const existing = doc.data();
    if (req.user.role !== 'superadmin' && existing.createdById !== req.user.id) {
      auditLog(req.user, 'DELETE_DENIED', `Evaluation ${req.params.id} owned by ${existing.createdById}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    await evaluationsRef.doc(req.params.id).delete();
    auditLog(req.user, 'DELETE', `Evaluation ${req.params.id} (${existing.employeeName})`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting evaluation:', err);
    res.status(500).json({ error: 'Failed to delete evaluation' });
  }
});

router.post('/import', async function(req, res) {
  try { ensureFirebase(); } catch(e) { return res.status(503).json({ error: 'Database not available' }); }
  try {
    if (req.user.role !== 'superadmin') {
      auditLog(req.user, 'IMPORT_DENIED', 'Non-superadmin attempted import');
      return res.status(403).json({ error: 'Only super admin can import data' });
    }
    const records = req.body.records;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'No records to import' });
    }
    const batch = db.batch();
    let count = 0;
    for (const record of records) {
      const entry = {
        employeeName: record.employeeName || '',
        employeeId: record.employeeId || '',
        position: record.position || '',
        hiredDate: record.hiredDate || '',
        campus: record.campus || '',
        gender: record.gender || '',
        appraiser: record.appraiser || '',
        reviewDate: record.reviewDate || '',
        criteria: record.criteria || [],
        superScores: record.superScores || [],
        totalSelf: parseFloat(record.totalSelf) || 0,
        totalSuper: parseFloat(record.totalSuper) || 0,
        overallScore: parseFloat(record.overallScore) || 0,
        timestamp: new Date().toISOString(),
        createdById: req.user.id,
        createdByName: req.user.name
      };
      const docRef = evaluationsRef.doc();
      batch.set(docRef, entry);
      count++;
    }
    await batch.commit();
    auditLog(req.user, 'IMPORT', `Imported ${count} evaluation records`);
    res.json({ success: true, count });
  } catch (err) {
    console.error('Error importing evaluations:', err);
    res.status(500).json({ error: 'Failed to import evaluations' });
  }
});

router.delete('/', async function(req, res) {
  try { ensureFirebase(); } catch(e) { return res.status(503).json({ error: 'Database not available' }); }
  try {
    if (req.user.role !== 'superadmin') {
      auditLog(req.user, 'CLEAR_DENIED', 'Non-superadmin attempted to clear all data');
      return res.status(403).json({ error: 'Only super admin can clear all data' });
    }
    const snapshot = await evaluationsRef.get();
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    auditLog(req.user, 'CLEAR', `Cleared all ${snapshot.size} evaluations`);
    res.json({ success: true, count: snapshot.size });
  } catch (err) {
    console.error('Error clearing evaluations:', err);
    res.status(500).json({ error: 'Failed to clear evaluations' });
  }
});

module.exports = router;
