const axios = require('axios');
const pool = require('../config/db');

// Helper to determine if current delivery is late
const MEAL_SCHEDULE = {
  Breakfast: { start: "06:00", end: "09:00" }, // Matched to your 9AM threshold
  Lunch:     { start: "11:00", end: "14:00" }, // Matched to your 2PM threshold
  Dinner:    { start: "17:00", end: "20:00" }  // Matched to your 8PM threshold
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

    // 2. Fetch REAL Patients from your Database
    const patientResult = await pool.query('SELECT * FROM patients');
    const dbPatients = patientResult.rows;

    // 3. Fetch Today's Meal Logs
    const localResult = await pool.query(
  'SELECT * FROM meal_logs WHERE DATE(serve_time) = CURRENT_DATE'
);

   // 4. Merge them
    const merged = dbPatients.map(p => {
      // Find the log for this specific patient
      const log = localResult.rows.find(l => l.hospital_number === p.hospital_number);

      const matchingDietMenus = menuResult.rows.filter(m => 
        m.diet_type.trim().toLowerCase() === p.kind_of_diet.trim().toLowerCase()
      );

      return {
        ...p,
        name: `${p.surname}, ${p.first_name}`,
        status: log ? 'Served' : 'Pending',
        serve_time: log ? log.serve_time : null,            // <-- ADD THIS
        delivery_remark: log ? log.delivery_remark : null,  // <-- ADD THIS
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
  // 1. Destructure the data from the frontend request
  const { hospitalNumber, mealType, status, deliveredBy } = req.body; 

  try {
    // 2. Insert into the database
    // Ensure the $5 matches the deliveredBy variable
    await pool.query(
      `INSERT INTO meal_logs 
       (hospital_number, meal_type, status, serve_time, delivery_remark, delivered_by) 
       VALUES ($1, $2, $3, NOW(), 'On Time', $4)`,
      [hospitalNumber, mealType, status, deliveredBy] // $4 corresponds to deliveredBy
    );

    res.status(200).json({ message: "Delivery recorded successfully" });
  } catch (err) {
    console.error("DATABASE ERROR:", err.message); // This will show the real error in your terminal
    res.status(500).json({ error: "Internal Server Error: " + err.message });
  }
};

exports.addMockPatients = async (req, res) => {
  const { patients } = req.body;
  try {
    // We use a transaction to ensure all or nothing is saved
    await pool.query('BEGIN');
    
    for (const p of patients) {
      // FIXED: Added room_number, allergies, npo_status, remarks to match our updated database
      const query = `
        INSERT INTO patients (hospital_number, first_name, surname, ward, age, religion, kind_of_diet, room_number, allergies, npo_status, remarks) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        ON CONFLICT (hospital_number) DO UPDATE 
        SET first_name = EXCLUDED.first_name, 
            surname = EXCLUDED.surname,
            ward = EXCLUDED.ward,
            room_number = EXCLUDED.room_number,
            allergies = EXCLUDED.allergies,
            npo_status = EXCLUDED.npo_status,
            remarks = EXCLUDED.remarks,
            kind_of_diet = EXCLUDED.kind_of_diet`;
      
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
        p.remarks
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

// PERMANENT CLEAR
exports.clearPatients = async (req, res) => {
  try {
    // We use TRUNCATE for a faster, cleaner wipe of the data
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

// Save a new event
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
  const { id } = req.params; // This is the hospital_number
  
  try {
    // 1. Fetch Meal Deliveries
    const mealsResult = await pool.query(
      `SELECT meal_type, serve_time, delivery_remark, delivered_by 
       FROM meal_logs 
       WHERE hospital_number = $1 AND status = 'Served'
       ORDER BY serve_time DESC`,
      [id]
    );

    // 2. Fetch ONS/Enteral Deliveries
    const onsResult = await pool.query(
      `SELECT 
          nutritional AS formula_name, 
          scoops AS volume, 
          ons_criteria AS remarks, 
          'System' AS prepared_by, 
          dispatch_time, 
          log_date AS created_at 
       FROM ons_logs 
       WHERE hospital_number = $1 AND dispatch_time IS NOT NULL
       ORDER BY dispatch_time DESC`,
      [id]
    );

    // 3. MOCK HIS/EMR API DATA (For Presentation Purposes)
    // This fills out the top grid of your UI until the real system is connected
    const isFemale = Math.random() > 0.5;
    const mockVitals = {
      birth_date: `19${Math.floor(50 + Math.random() * 40)}-0${Math.floor(1 + Math.random() * 9)}-1${Math.floor(1 + Math.random() * 8)}`,
      sex: isFemale ? "Female" : "Male",
      height: `${Math.floor(150 + Math.random() * 30)} cm`,
      weight: `${Math.floor(50 + Math.random() * 40)} kg`,
      bp: `${Math.floor(110 + Math.random() * 30)}/${Math.floor(70 + Math.random() * 20)}`,
      temp: `36.${Math.floor(1 + Math.random() * 8)} °C`,
      pulse: `${Math.floor(65 + Math.random() * 25)} bpm`,
      resp: `${Math.floor(14 + Math.random() * 6)} cpm`
    };

    // 4. Send everything back to the frontend
    res.json({
      ...mockVitals, // Spreads the mock vitals into the response
      meal_history: mealsResult.rows,
      ons_history: onsResult.rows
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};