const pool = require('../config/db'); // Adjust path to your DB config if needed

// GET all patients who are currently on an ONS or Tube Feeding diet
exports.getONSPatients = async (req, res) => {
  try {
    // Fetches patients whose diet explicitly requires ONS/Tube feeding
    const result = await pool.query(`
      SELECT * FROM patients 
      WHERE kind_of_diet IN ('Tube Feeding', 'General Liquid', 'Clear Liquid', 'Palatable')
      ORDER BY ward ASC, surname ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET a specific patient's ONS history/ledger
exports.getPatientONSHistory = async (req, res) => {
  const { id } = req.params; // hospital_number
  try {
    const result = await pool.query(
      'SELECT * FROM ons_logs WHERE hospital_number = $1 ORDER BY log_date DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST a new ONS entry (Auto-calculates the billing)
// POST a new ONS entry (Auto-calculates billing AND deducts from inventory)
exports.addONSEntry = async (req, res) => {
  const { hospital_number, log_date, ons_criteria, nutritional, scoops, frequency, unit_cost } = req.body;
  
  const total_scoops_consumed = parseFloat(scoops) * parseInt(frequency);
  const total_amount = total_scoops_consumed * parseFloat(unit_cost);

  try {
    // BEGIN a transaction so if one step fails, it cancels everything
    await pool.query('BEGIN');

    // 1. Insert the billing record into the ledger
    const result = await pool.query(
      `INSERT INTO ons_logs 
      (hospital_number, log_date, ons_criteria, nutritional, scoops, frequency, total_scoops, unit_cost, total_amount) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [hospital_number, log_date, ons_criteria, nutritional, scoops, frequency, total_scoops_consumed, unit_cost, total_amount]
    );

    // 2. Fetch the current inventory item to figure out the Grams per Scoop
    const invRes = await pool.query('SELECT * FROM dietary_inventory WHERE nutritional_name = $1 LIMIT 1', [nutritional]);
    
    if (invRes.rows.length > 0) {
      const item = invRes.rows[0];
      
      // Calculate how many grams to deduct based on how much was consumed
      // (e.g. 400g / 40 scoops = 10g per scoop)
      const gramsPerScoop = parseFloat(item.total_grams) / parseFloat(item.scoops_left); 
      const consumedGrams = total_scoops_consumed * gramsPerScoop;

      // 3. Deduct the stock from the database
      await pool.query(
        `UPDATE dietary_inventory 
         SET scoops_left = scoops_left - $1, 
             total_grams = total_grams - $2,
             last_edited = CURRENT_TIMESTAMP
         WHERE id = $3`,
         [total_scoops_consumed, consumedGrams, item.id]
      );
    }

    await pool.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error("ONS Insert Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


// GET current inventory stock
exports.getInventory = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dietary_inventory ORDER BY nutritional_name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST: Add a new inventory item
exports.addInventoryItem = async (req, res) => {
  const { criteria, nutritional_name, total_scoops, scoops_left, total_grams, cost_per_scoop, cost_per_gram, total_unit_cost } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO dietary_inventory 
      (criteria, nutritional_name, total_scoops, scoops_left, total_grams, cost_per_scoop, cost_per_gram, total_unit_cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [criteria, nutritional_name, total_scoops, scoops_left, total_grams, cost_per_scoop, cost_per_gram, total_unit_cost]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT: Update an existing inventory item
exports.updateInventoryItem = async (req, res) => {
  const { id } = req.params;
  const { criteria, nutritional_name, total_scoops, scoops_left, total_grams, cost_per_scoop, cost_per_gram, total_unit_cost } = req.body;
  try {
    const result = await pool.query(
      `UPDATE dietary_inventory 
      SET criteria=$1, nutritional_name=$2, total_scoops=$3, scoops_left=$4, total_grams=$5, 
          cost_per_scoop=$6, cost_per_gram=$7, total_unit_cost=$8, last_edited=CURRENT_TIMESTAMP
      WHERE id=$9 RETURNING *`,
      [criteria, nutritional_name, total_scoops, scoops_left, total_grams, cost_per_scoop, cost_per_gram, total_unit_cost, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET today's preparation tasks
exports.getPrepTasks = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query(`
      SELECT l.*, p.surname, p.first_name, p.ward, p.room_number 
      FROM ons_logs l
      JOIN patients p ON l.hospital_number = p.hospital_number
      WHERE l.log_date = $1
      ORDER BY l.dispatch_time DESC NULLS FIRST, p.ward ASC
    `, [today]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH: Mark a task as prepared/dispatched
exports.markPrepared = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE ons_logs SET dispatch_time = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    res.json({ message: "Dispatched successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.markServed = async (req, res) => {
  const { id } = req.params;
  const { delivered_by } = req.body;
  
  try {
    const result = await pool.query(
      'UPDATE ons_logs SET served_time = CURRENT_TIMESTAMP, delivered_by = $1 WHERE id = $2 RETURNING *',
      [delivered_by, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Log entry not found" });
    }

    res.status(200).json({ message: "Served successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};