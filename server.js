require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('Connected successfully to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import User model
const User = require('./model/User'); // Adjust path as needed

// Initialize Express
const app = express();
const port = 3000; // Port for the server

app.use(cors());

// Middleware to parse JSON with increased limit
app.use(express.json({ limit: '10mb' }));

// Routes
const userRoutes = require('./routes/user');
const areaRoutes = require('./routes/area');

app.use('/api/users', userRoutes);
app.use('/api', areaRoutes);

// Function to delete expired news items from all users
const deleteExpiredNews = async () => {
  try {
    const currentDate = new Date();
    const users = await User.find();

    console.log(`Processing ${users.length} users for expired news deletion.`);

    for (const user of users) {
      user.news = user.news.filter(news => new Date(news.expiryDate) > currentDate);
      await user.save();
    }

    console.log('Expired news deleted successfully!');
  } catch (err) {
    console.error('Error deleting expired news:', err);
  }
};

// Run this every day (24 hours)
setInterval(deleteExpiredNews, 24 * 60 * 60 * 1000);

// Serve ads.txt
app.get('/app-ads.txt', (req, res) => {
  const adsFilePath = path.join(__dirname, 'ads.txt');

  if (fs.existsSync(adsFilePath)) {
    res.sendFile(adsFilePath);
  } else {
    res.status(404).send('ads.txt file not found');
  }
});

// Root Route
app.get('/', (req, res) => {
  res.status(200).send('Welcome to GoloZap!');
});

// Start the server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}/`);
});
