const axios = require('axios');
const pool = require('../config/db');

// CHANGE THIS NAME HERE:
exports.getPatientList = async (req, res) => {
  try {
    // 1. MOCK DATA
    const externalPatients = [
      { hospital_number: '2026-001', surname: 'Dela Cruz', first_name: 'Juan', ward: 'ACE', bed_no: 'B-101', age: 45, religion: 'RC', kind_of_diet: 'Regular Diet' },
      { hospital_number: '2026-002', surname: 'Rizal', first_name: 'Jose', ward: 'ICU', bed_no: 'B-205', age: 30, religion: 'RC', kind_of_diet: 'NPO' },
      { hospital_number: '2026-003', surname: 'Luna', first_name: 'Antonio', ward: 'OB-WARD', bed_no: 'B-302', age: 28, religion: 'INC', kind_of_diet: 'Low Salt, Low Fat' }
    ];

    const localResult = await pool.query('SELECT * FROM meal_logs');

    const merged = externalPatients.map(p => ({
      ...p,
      name: `${p.surname}, ${p.first_name}`,
      status: localResult.rows.find(l => l.hospital_number === p.hospital_number) ? 'Served' : 'Pending'
    }));

    res.json(merged);
  } catch (err) {
    console.error("Backend Error:", err.message);
    res.status(500).json({ error: "Database Connection Error: " + err.message });
  }
};

exports.servePatient = async (req, res) => {
  const { hospitalNumber, mealType } = req.body;
  try {
    await pool.query(
      'INSERT INTO meal_logs (hospital_number, meal_type, serve_time, status) VALUES ($1, $2, NOW(), $3)',
      [hospitalNumber, mealType, 'Served']
    );
    res.status(200).json({ message: "Successfully recorded" });
  } catch (err) {
    console.error("Save Error:", err.message);
    res.status(500).json({ error: "Failed to save: " + err.message });
  }
};