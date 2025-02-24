require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const Razorpay = require('razorpay');

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('Connected successfully to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import User model
const User = require('./model/User'); // Adjust path as needed

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,  // Your Razorpay Key ID
  key_secret: process.env.RAZORPAY_KEY_SECRET  // Your Razorpay Key Secret
});

// Initialize Express
const app = express();
const port = process.env.PORT || 3000; // Port for the server


app.use(cors());

// Middleware to parse JSON with increased limit
app.use(express.json({ limit: '10mb' }));

// Routes
const userRoutes = require('./routes/user');
const areaRoutes = require('./routes/area');
const subscriptionRoutes = require('./routes/razorpaysubscription');
const othersRoutes = require('./routes/others');

app.use('/api/others', othersRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/users', userRoutes);
app.use('/api', areaRoutes);

// Function to check subscription status from Razorpay
const checkSubscriptionStatus = async (subscriptionId) => {
  try {
    const subscription = await razorpay.subscriptions.fetch(subscriptionId);
    return subscription.status;  // subscription.status can be 'active', 'expired', etc.
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return null; // In case of error, return null or handle accordingly
  }
};

// Function to check and update subscription status for all users
const updateSubscriptionStatus = async () => {
  try {
    // Fetch all users
    const users = await User.find({});

    for (const user of users) {
      if (user.subscriptionId) {
        const currentStatus = await checkSubscriptionStatus(user.subscriptionId);

        // Update the subscription status in the database
        if (currentStatus) {
          user.subscriptionStatus = currentStatus;
          await user.save();  // Save updated user data
          console.log(`Updated subscription status for user ${user.uniqueId} to ${currentStatus}`);
        } else {
          console.log(`Couldn't fetch status for user ${user.uniqueId}`);
        }
      }
    }
  } catch (error) {
    console.error('Error updating subscription statuses:', error);
  }
};

// Set up cron job to run every month (e.g., on the 1st day of every month)
cron.schedule('0 0 1 * *', updateSubscriptionStatus);  // This runs at midnight on the 1st day of every month

// cron.schedule('* * * * *', () => {
//   console.log('This will run every minute');
// });


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

const updateOldUsers = async () => {
  try {
    await User.updateMany(
      {
        $or: [
          { orderType: { $exists: false } },
          { orderStatus: { $exists: false } },
          { orderid: { $exists: false } },
          { subscriptionType: { $exists: false } },
          { subscriptionStatus: { $exists: false } },
          { subscriptionId: { $exists: false } },
          { news: { $exists: false } },
          { media: { $exists: false } }, // ✅ Ensure media object exists
        ]
      }, 
      { 
        $set: { 
          orderType: "null",
          orderStatus: "null",
          orderid: "null", 
          subscriptionType: "null", 
          subscriptionStatus: "null", 
          subscriptionId: "null",
          news: [], // ✅ Initialize news as an empty array
          media: { // ✅ Initialize media with empty strings
            instagram: "",
            facebook: "",
            linkedin: "",
            twitter: "",
            youtube: "",
            telegram: "",
            google: ""
          }
        }
      }
    );
    console.log("✅ Old Users Updated with Missing Fields Only");
  } catch (err) {
    console.error("❌ Error Updating Old Users:", err);
  }
};


// Run the Update Function Every Second
setInterval(updateOldUsers, 100000); // 100000 ms = 100 second

// Start the server
app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}/`);
});
