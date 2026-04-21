const pool = require('../config/db');

// --- NEW: Added missing getDashboard to stop the crash ---
exports.getDashboard = async (req, res) => {
  try {
    const userStats = await pool.query('SELECT COUNT(*) as total FROM users');
    const logStats = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    const pendingStats = await pool.query("SELECT COUNT(*) as total FROM users WHERE status = 'Pending'");
    
    res.json({
      totalUsers: userStats.rows[0].total,
      totalLogs: logStats.rows[0].total,
      pendingApprovals: pendingStats.rows[0].total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: Fetch all users
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, username, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- NEW: Added missing createUser placeholder ---
exports.createUser = async (req, res) => {
  res.status(501).json({ message: "Admin direct creation not yet implemented" });
};

// PUT: Update a user's Role and Status
exports.updateUser = async (req, res) => {
  const { id } = req.params; // The ID of the user being approved
  const { role, status, admin_id } = req.body; // admin_id is the person clicking 'Save'

  try {
    // 1. Update the user's status/role
    const result = await pool.query(
      'UPDATE users SET role = $1, status = $2 WHERE id = $3 RETURNING id, full_name, role, status',
      [role, status, id]
    );

    const targetUser = result.rows[0];

    // 2. RECORD THE AUDIT LOG
    // This connects the Admin's ID to the action
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)',
      [
        admin_id, 
        'Staff Approval/Update', 
        'Admin Security', 
        `Updated ${targetUser.full_name} (@${targetUser.username}) to Role: ${role}, Status: ${status}`
      ]
    );

    res.json(targetUser);
  } catch (err) {
    console.error("Update User Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// --- NEW: Added missing deleteUser placeholder ---
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: Fetch Audit Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.id, l.action, l.module, l.details, l.created_at, u.full_name as user_name 
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 500
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};