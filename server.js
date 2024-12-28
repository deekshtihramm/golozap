// Load environment variables from the .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('Connected successfully to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Initialize Express
const app = express();
const port = 3000; // Port for the server

app.use(cors());

// Middleware to parse JSON with increased limit
app.use(express.json({ limit: '10mb' })); // Adjust the limit as needed

// Routes
const userRoutes = require('./routes/user');
const areaRoutes = require('./routes/area');

// Route middleware

app.use('/api/users', userRoutes);
app.use('/api', areaRoutes);

// Serve ads.txt
app.get('/app-ads.txt', (req, res) => {
  const adsFilePath = path.join(__dirname, 'ads.txt');

  // Check if the ads.txt file exists
  if (fs.existsSync(adsFilePath)) {
    res.sendFile(adsFilePath); // Serve the file
  } else {
    res.status(404).send('ads.txt file not found');
  }
});


// Serve ads.txt
app.get('/', (req, res) => {
  
  res.status(404).send('Wellcome to GOloZap');

});

// Start the server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}/`);
});
