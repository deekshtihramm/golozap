const express = require('express');
const router = express.Router();
const { User } = require('../model/User');
const { Others } = require('../model/Others');
const moment = require('moment');
const cron = require('node-cron');

// ✅ Function to scan user data and update analytics
const updateAnalytics = async () => {
    try {
        console.log("🔄 Updating analytics...");

        // ✅ Get current date and previous day/month calculations
        const startOfDay = moment().startOf('day').toDate();
        const startOfMonth = moment().startOf('month').toDate();

        // ✅ Efficiently count total users, providers, and registrations using aggregation
        const userCounts = await User.userCounts([
            {
                $facet: {
                    totalUsers: [{ $count: "count" }],
                    totalProviders: [{ $match: { businessAccountStatus: true } }, { $count: "count" }],
                    lastDayRegistrations: [{ $match: { createdAt: { $gte: startOfDay } } }, { $count: "count" }],
                    lastMonthRegistrations: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: "count" }]
                }
            }
        ]);

        const totalUsers = userCounts[0].totalUsers[0]?.count || 0;
        const totalProviders = userCounts[0].totalProviders[0]?.count || 0;
        const lastDayRegistrations = userCounts[0].lastDayRegistrations[0]?.count || 0;
        const lastMonthRegistrations = userCounts[0].lastMonthRegistrations[0]?.count || 0;

        // ✅ Find most popular services (top 10)
        const topServices = await User.aggregate([
            { $unwind: { path: "$serviceTypes", preserveNullAndEmptyArrays: true } },
            { $group: { _id: "$serviceTypes", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // ✅ Find most active locations (top 10)
        const mostActiveLocations = await User.aggregate([
            { $match: { businesslocation: { $ne: null } } }, // Exclude null values
            { $group: { _id: "$businesslocation", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // ✅ Update or create an `Others` document
        let analytics = await Others.findOne().sort({ createdAt: -1 }); // Get latest analytics
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
        console.log("✅ Analytics updated successfully!");
    } catch (error) {
        console.error("❌ Error updating analytics:", error.message);
    }
};

// ✅ API: Run analytics update manually
router.put('/update', async (req, res) => {
    try {
        await updateAnalytics();
        res.json({ message: "Analytics updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ API: Get latest analytics data
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await Others.findOne().sort({ createdAt: -1 }) || {};
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Schedule daily update at midnight using cron
cron.schedule('0 0 * * *', async () => {
    try {
        console.log("⏳ Running scheduled analytics update...");
        await updateAnalytics();
    } catch (error) {
        console.error("❌ Error in scheduled analytics update:", error.message);
    }
});

module.exports = router;
