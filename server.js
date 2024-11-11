// Load environment variables from the .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose'); // Import mongoose

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('Connected successfully to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Initialize Express
const app = express();
const port = 3000; // Port for the server

// Middleware to parse JSON with increased limit
app.use(express.json({ limit: '10mb' })); // Adjust the limit as needed

// Routes
const userRoutes = require('./routes/user');
const areaRoutes = require('./routes/area');

// Route middleware
app.use('/api/users', userRoutes);
app.use('/api', areaRoutes);

// Start the server
app.listen(port, async () => {
  console.log(`Server running at https://golozap.vercel.app`);
});
