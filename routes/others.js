const express = require('express');
const router = express.Router();
const { User } = require('../models/User');
const { Others } = require('../models/Others');
const moment = require('moment');

// ✅ Function to scan user data and update analytics
const updateAnalytics = async () => {
    try {
        // Get current date and previous day/month calculations
        const now = new Date();
        const startOfDay = moment().startOf('day').toDate();
        const startOfMonth = moment().startOf('month').toDate();

        // ✅ Count total users
        const totalUsers = await User.countDocuments();

        // ✅ Count total providers (users with business accounts)
        const totalProviders = await User.countDocuments({ businessAccountStatus: true });

        // ✅ Count users registered in the last day
        const lastDayRegistrations = await User.countDocuments({ createdAt: { $gte: startOfDay } });

        // ✅ Count users registered in the last month
        const lastMonthRegistrations = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

        // ✅ Find most popular services (top 10)
        const topServices = await User.aggregate([
            { $unwind: "$serviceTypes" },
            { $group: { _id: "$serviceTypes", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // ✅ Find most active locations (top 10)
        const mostActiveLocations = await User.aggregate([
            { $group: { _id: "$businesslocation", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // ✅ Update or create an `Others` document
        let analytics = await Others.findOne();
        if (!analytics) {
            analytics = new Others();
        }

        analytics.totalUsers = totalUsers;
        analytics.totalProviders = totalProviders;
        analytics.lastDayRegistrations = lastDayRegistrations;
        analytics.lastMonthRegistrations = lastMonthRegistrations;
        analytics.topServices = topServices.map(s => s._id);
        analytics.mostActiveLocations = mostActiveLocations.map(l => l._id);
        
        await analytics.save();
        console.log("✅ Daily analytics updated successfully!");
    } catch (error) {
        console.error("❌ Error updating analytics:", error.message);
    }
};

// ✅ Run analytics update manually via API
router.put('/update', async (req, res) => {
    try {
        await updateAnalytics();
        res.json({ message: "Analytics updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Get latest analytics data
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await Others.findOne();
        
        if (!analytics) {
            return res.status(404).json({ message: "No analytics data found" });
        }

        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Schedule daily update at midnight
setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        await updateAnalytics();
    }
}, 60000); // Runs every 1 minute to check if it's midnight

module.exports = router;
