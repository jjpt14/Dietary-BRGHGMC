const axios = require('axios');
const pool = require('../config/db');

// Helper to determine if current delivery is late
const MEAL_SCHEDULE = {
  Breakfast: { start: "06:00", end: "09:00" },
  Lunch:     { start: "11:00", end: "14:00" },
  Dinner:    { start: "17:00", end: "20:00" }
};

const getDeliveryStatus = (mealType) => {
  if (!MEAL_SCHEDULE[mealType]) return 'On Time';
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  const [endH, endM] = MEAL_SCHEDULE[mealType].end.split(':').map(Number);
  const endTime = endH * 100 + endM;
  return (currentTime <= endTime) ? 'On Time' : 'Late Delivery';
};

exports.getPatientList = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch Today's Master Menus
    const menuResult = await pool.query(
      'SELECT * FROM daily_master_menus WHERE event_date = $1', 
      [today]
    );

    // 2. Fetch Patients (Including the isolation_precaution column)
    const patientResult = await pool.query('SELECT * FROM patients ORDER BY surname ASC');
    const dbPatients = patientResult.rows;

    // 3. Fetch Today's Meal Logs
    const localResult = await pool.query(
      'SELECT * FROM meal_logs WHERE DATE(serve_time) = CURRENT_DATE'
    );

    // 4. Merge Data
    const merged = dbPatients.map(p => {
      const log = localResult.rows.find(l => l.hospital_number === p.hospital_number);
      const matchingDietMenus = menuResult.rows.filter(m => 
        m.diet_type.trim().toLowerCase() === p.kind_of_diet.trim().toLowerCase()
      );

      return {
        ...p,
        name: `${p.surname}, ${p.first_name}`,
        status: log ? 'Served' : 'Pending',
        serve_time: log ? log.serve_time : null,
        delivery_remark: log ? log.delivery_remark : null,
        dietSpecificMenus: matchingDietMenus 
      };
    });

    res.json(merged);
  } catch (err) {
    console.error("GET PATIENT LIST ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.servePatient = async (req, res) => {
  const { hospitalNumber, mealType, status, deliveredBy } = req.body; 
  try {
    await pool.query(
      `INSERT INTO meal_logs 
        (hospital_number, meal_type, status, serve_time, delivery_remark, delivered_by) 
        VALUES ($1, $2, $3, NOW(), 'On Time', $4)`,
      [hospitalNumber, mealType, status, deliveredBy]
    );
    res.status(200).json({ message: "Delivery recorded successfully" });
  } catch (err) {
    console.error("DATABASE ERROR:", err.message);
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

exports.addMockPatients = async (req, res) => {
  const { patients } = req.body;
  try {
    await pool.query('BEGIN');
    
    for (const p of patients) {
      const query = `
        INSERT INTO patients (
          hospital_number, first_name, surname, ward, age, religion, 
          kind_of_diet, room_number, allergies, npo_status, remarks, isolation_precaution
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
        ON CONFLICT (hospital_number) DO UPDATE 
        SET first_name = EXCLUDED.first_name, 
            surname = EXCLUDED.surname,
            ward = EXCLUDED.ward,
            room_number = EXCLUDED.room_number,
            allergies = EXCLUDED.allergies,
            npo_status = EXCLUDED.npo_status,
            remarks = EXCLUDED.remarks,
            kind_of_diet = EXCLUDED.kind_of_diet,
            isolation_precaution = EXCLUDED.isolation_precaution`;
      
      await pool.query(query, [
        p.hospital_number, 
        p.first_name, 
        p.surname, 
        p.ward, 
        p.age, 
        p.religion, 
        p.kind_of_diet,
        p.room_number,
        p.allergies,
        p.npo_status,
        p.remarks,
        p.isolation_precaution || 'None'
      ]);
    }
    
    await pool.query('COMMIT');
    res.json({ message: "Mock patients saved successfully" });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("BACKEND ERROR:", err.message);
    res.status(500).json({ error: "Database insertion failed: " + err.message });
  }
};

exports.clearPatients = async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE meal_logs, patients RESTART IDENTITY CASCADE');
    res.json({ message: "Database wiped clean for fresh testing." });
  } catch (err) {
    console.error("BACKEND ERROR:", err.message);
    res.status(500).json({ error: "Table missing or DB error: " + err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM special_events ORDER BY event_date ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveEvent = async (req, res) => {
  const { title, date, pax, mealType } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO special_events (title, event_date, pax, meal_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, date, pax, mealType]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPatientProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const mealsResult = await pool.query(
      `SELECT meal_type, serve_time, delivery_remark, delivered_by 
       FROM meal_logs 
       WHERE hospital_number = $1 AND status = 'Served'
       ORDER BY serve_time DESC`,
      [id]
    );

    const onsResult = await pool.query(
      `SELECT nutritional AS formula_name, scoops AS volume, ons_criteria AS remarks, 
       'System' AS prepared_by, dispatch_time, log_date AS created_at 
       FROM ons_logs 
       WHERE hospital_number = $1 AND dispatch_time IS NOT NULL
       ORDER BY dispatch_time DESC`,
      [id]
    );

    const mockVitals = {
      birth_date: `19${Math.floor(50 + Math.random() * 40)}-0${Math.floor(1 + Math.random() * 9)}-1${Math.floor(1 + Math.random() * 8)}`,
      sex: Math.random() > 0.5 ? "Female" : "Male",
      height: `${Math.floor(150 + Math.random() * 30)} cm`,
      weight: `${Math.floor(50 + Math.random() * 40)} kg`,
      bp: `${Math.floor(110 + Math.random() * 30)}/${Math.floor(70 + Math.random() * 20)}`,
      temp: `36.${Math.floor(1 + Math.random() * 8)} °C`,
      pulse: `${Math.floor(65 + Math.random() * 25)} bpm`,
      resp: `${Math.floor(14 + Math.random() * 6)} cpm`
    };

    res.json({
      ...mockVitals,
      meal_history: mealsResult.rows,
      ons_history: onsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Isolation Precaution (Used by Nurses)
exports.updatePrecaution = async (req, res) => {
    const { hospitalNumber } = req.params;
    const { isolation_precaution } = req.body;

    const sql = "UPDATE patients SET isolation_precaution = $1 WHERE hospital_number = $2";

    try {
        const result = await pool.query(sql, [isolation_precaution, hospitalNumber]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Patient not found" });
        }
        res.status(200).json({ message: "Update successful" });
    } catch (err) {
        console.error("DB ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
};