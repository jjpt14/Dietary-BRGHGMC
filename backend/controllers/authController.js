const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your_super_secret_hospital_key';

// 1. MUST HAVE 'exports.register'
exports.register = async (req, res) => {
  const { full_name, username, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    await pool.query(
      'INSERT INTO users (full_name, username, password_hash) VALUES ($1, $2, $3)',
      [full_name, username, hash]
    );
    res.status(201).json({ message: "Registration successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. MUST HAVE 'exports.login'
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: "User not found" });
    
    const user = result.rows[0]; // Store user data
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Wrong password" });

    // 1. Create the token
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);

    // 2. THE MISSING PIECE: Record the audit log
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, module, details) VALUES ($1, $2, $3, $4)',
      [
        user.id, 
        'User Login', 
        'Authentication', 
        `Logged in from ${req.ip || 'Unknown IP'}`
      ]
    );

    // 3. Send response
    res.json({ 
      token, 
      user: { id: user.id, full_name: user.full_name, role: user.role } 
    });

  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 3. MUST HAVE 'exports.createFirstAdmin' (matches Line 9 in Routes)
exports.createFirstAdmin = async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    await pool.query(
      `INSERT INTO users (full_name, username, password_hash, role, status) 
       VALUES ('System Admin', 'it_admin', $1, 'IT', 'Active') 
       ON CONFLICT (username) DO NOTHING`, [hash]
    );
    res.json({ message: "Admin seeded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};