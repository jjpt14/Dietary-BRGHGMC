const express = require('express');
const cors = require('cors');
require('dotenv').config();
const patientListRoutes = require('./routes/patientListRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Apply Routes with /api prefix
app.use('/api', patientListRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\x1b[32m✔\x1b[0m Backend active on Port ${PORT}`);
});