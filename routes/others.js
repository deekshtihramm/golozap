const express = require('express');
const router = express.Router();
// const { User } = require('../model/User');
const User = require('../model/User');  // ✅ Correct
const { Others } = require('../model/Others');
const moment = require('moment');
const cron = require('node-cron');

// ✅ Function to scan user data and update analytics
const updateAnalytics = async () => {
    try {
        console.log("🔄 Updating analytics...");

        if (!User || typeof User.aggregate !== 'function') {
            throw new Error("User model is not properly loaded!");
        }

        // ✅ Get current date and previous day/month calculations
        const startOfDay = moment().startOf('day').toDate();
        const startOfMonth = moment().startOf('month').toDate();

        // ✅ Fetch user counts
        let userCounts;
        try {
            userCounts = await User.aggregate([
                {
                    $facet: {
                        totalUsers: [{ $count: "count" }],
                        totalProviders: [{ $match: { businessAccountStatus: true } }, { $count: "count" }],
                        lastDayRegistrations: [{ $match: { createdAt: { $gte: startOfDay } } }, { $count: "count" }],
                        lastMonthRegistrations: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: "count" }]
                    }
                }
            ]).exec();
        } catch (err) {
            throw new Error("Error during user count aggregation: " + err.message);
        }

        const totalUsers = userCounts[0]?.totalUsers[0]?.count || 0;
        const totalProviders = userCounts[0]?.totalProviders[0]?.count || 0;
        const lastDayRegistrations = userCounts[0]?.lastDayRegistrations[0]?.count || 0;
        const lastMonthRegistrations = userCounts[0]?.lastMonthRegistrations[0]?.count || 0;

        // ✅ Find most popular services (top 10)
        let topServices;
        try {
            topServices = await User.aggregate([
                { $unwind: { path: "$serviceTypes", preserveNullAndEmptyArrays: true } },
                { $group: { _id: "$serviceTypes", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]).exec();
        } catch (err) {
            throw new Error("Error during top services aggregation: " + err.message);
        }

        // ✅ Update or create an `Others` document
        let analytics = await Others.findOne().sort({ createdAt: -1 }).exec(); // Get latest analytics
        if (!analytics) {
            analytics = new Others();
        }

        analytics.totalUsers = totalUsers;
        analytics.totalProviders = totalProviders;
        analytics.lastDayRegistrations = lastDayRegistrations;
        analytics.lastMonthRegistrations = lastMonthRegistrations;
        analytics.topServices = topServices.map(s => s._id);       

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

// ✅ API: Get latest analytics data (without topServices & mostActiveLocations)
router.get('/analytics', async (req, res) => {
    try {
        const analytics = await Others.findOne().sort({ createdAt: -1 }).lean().exec();
        
        if (!analytics) {
            return res.json({});
        }

        // Remove `topServices` and `mostActiveLocations` before sending response
        const { topServices, mostActiveLocations, ...filteredAnalytics } = analytics;
        
        res.json(filteredAnalytics);
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
