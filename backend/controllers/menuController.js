const pool = require('../config/db');

// 1. SAVE or UPDATE the daily master menu
exports.saveMenu = async (req, res) => {
  // FIXED: Changed to snake_case to perfectly match what React Axios is sending
  const {
    meal_type,
    diet_type,
    protein_dish,
    vegetable_dish,
    // Optional fallback fields (in case frontend doesn't send them)
    event_date,
    carbohydrates = '',
    carbs_cal = 0,
    protein_cal = 0,
    veg_cal = 0,
    dessert = '',
    dessert_cal = 0,
    quantity = 0,
    special_function = false,
    participants = 0
  } = req.body;

  // Provide a default date of "today" if the frontend didn't pass one,
  // since your database ON CONFLICT requires an event_date.
  const targetDate = event_date || new Date().toISOString().split('T')[0];

  try {
    const query = `
      INSERT INTO daily_master_menus (
        meal_type, event_date, diet_type, carbohydrates, carbs_cal,
        protein_dish, protein_cal, vegetable_dish, veg_cal, dessert,
        dessert_cal, quantity, special_function, participants
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (event_date, meal_type, diet_type) 
      DO UPDATE SET 
        carbohydrates = $4, carbs_cal = $5, protein_dish = $6, 
        protein_cal = $7, vegetable_dish = $8, veg_cal = $9, 
        dessert = $10, dessert_cal = $11, quantity = $12, 
        special_function = $13, participants = $14
      RETURNING *`;

    const values = [
      meal_type, targetDate, diet_type, carbohydrates, carbs_cal,
      protein_dish, protein_cal, vegetable_dish, veg_cal, dessert,
      dessert_cal, quantity, special_function, participants
    ];

    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Controller Error (saveMenu):", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 2. FETCH all historical records for the Dashboard
// Ensure this name matches exactly in menuRoutes.js
exports.getMenuHistory = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM daily_master_menus ORDER BY event_date DESC, meal_type ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Controller Error (getMenuHistory):", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.toggleMenuStatus = async (req, res) => {
  const { id, is_completed } = req.body;
  try {
    await pool.query(
      'UPDATE daily_master_menus SET is_completed = $1 WHERE id = $2',
      [is_completed, id]
    );
    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMenuStatus = async (req, res) => {
  const { id } = req.params;
  const { is_completed, completed_time } = req.body; 
  
  try {
    await pool.query(
      'UPDATE daily_master_menus SET is_completed = $1, completed_time = $2 WHERE id = $3',
      [is_completed, completed_time, id]
    );
    res.status(200).json({ message: "Status and time updated" });
  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM special_events WHERE event_date::date = CURRENT_DATE ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveEvent = async (req, res) => {
  // We now accept BOTH meal_type and menu_details from React
  const { event_name, date, pax, meal_type, menu_details } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO special_events (title, event_date, pax, meal_type, menu_details) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [event_name, date, pax, meal_type, menu_details]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Controller Error (saveEvent):", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM special_events WHERE id = $1', [id]);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMenu = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM daily_master_menus WHERE id = $1', [id]);
    res.status(200).json({ message: "Menu deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE Event Status & Time
exports.updateEventStatus = async (req, res) => {
  const { id } = req.params;
  const { is_completed, completed_time, is_dispatched, delivered_by } = req.body; 
  
  try {
    await pool.query(
      `UPDATE special_events 
       SET is_completed = COALESCE($1, is_completed), 
           completed_time = COALESCE($2, completed_time),
           is_dispatched = COALESCE($3, is_dispatched),
           delivered_by = COALESCE($4, delivered_by),
           dispatched_at = CASE WHEN $3 = true THEN NOW() ELSE dispatched_at END
       WHERE id = $5`,
      [is_completed, completed_time, is_dispatched, delivered_by, id]
    );
    res.status(200).json({ message: "Event updated successfully" });
  } catch (err) {
    console.error("Database Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};