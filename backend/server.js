const express = require('express');
const cors = require('cors');
require('dotenv').config();
const patientListRoutes = require('./routes/patientListRoutes');
const menuRoutes = require('./routes/menuRoutes');
const onsRoutes = require('./routes/onsRoutes');
const adminRoutes = require('./routes/adminRoutes');  
const authRoutes = require('./routes/authRoutes'); 
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());


app.use('/api', patientListRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/ons', onsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\x1b[32m✔\x1b[0m Backend active on Port ${PORT}`);
});