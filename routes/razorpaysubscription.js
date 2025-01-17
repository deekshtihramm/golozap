require('dotenv').config(); // Load environment variables

const express = require('express');
const RazorpaySubscription = require('../model/RazorpaySubscription'); // Import the subscription model
const User = require('../model/User'); // Import the User model
const Razorpay = require('razorpay');

const router = express.Router();

// Razorpay API Key and Secret from environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, // Set in environment variables
    key_secret: process.env.RAZORPAY_KEY_SECRET, // Set in environment variables
});


// Utility function to add one month to a given date
function addOneMonth(date) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);

  // Handle edge cases for months with fewer days
  if (result.getDate() < date.getDate()) {
    result.setDate(0); // Move to the last day of the previous month
  }
  return result;
}

// Add subscription API with verification
router.post('/add_basic_subscription', async (req, res) => {
  try {
    const { personalEmail, uniqueId, total_count } = req.body;

    // Validate inputs
    if (!personalEmail || !uniqueId || !total_count) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Verify personalEmail and uniqueId in the User collection
    const user = await User.findOne({ personalEmail, uniqueId });
    if (!user) {
      return res.status(404).json({ message: 'User not found with provided email and uniqueId' });
    }

    // Set default values
    const planId = req.body.planId || 'plan_PkToXDZwIDKyWj'; // Replace with your default Plan ID
    const amount = req.body.amount || 2900; // Default amount in paise (e.g., 29.0 INR)
    const currency = req.body.currency || 'INR'; // Default currency to INR
    const startDate = req.body.startDate || new Date().toISOString(); // Default to current time

    // if (isNaN(new Date(startDate).getTime())) {
    //   return res.status(400).json({ message: 'Invalid startDate provided' });
    // }

    // Create Razorpay subscription
    const subscriptionOptions = {
      plan_id: planId, // Plan ID from Razorpay
      total_count: total_count || 12, // Default to 12 payments if not provided
      customer_notify: 1, // Notify customer via email/SMS
      start_at: Math.floor(new Date(startDate).getTime() / 1000), // Convert to UNIX timestamp
      quantity: 1,
    };

    const razorpaySubscription = await razorpay.subscriptions.create(subscriptionOptions);

    // Calculate the next payment date
    const subscriptionStartDate = new Date(razorpaySubscription.start_at * 1000);
    const nextPaymentDate = addOneMonth(subscriptionStartDate);

    // Save subscription details in the database
    const newSubscription = new RazorpaySubscription({
      subscriptionId: razorpaySubscription.id,
      planId,
      customerId: uniqueId, // Storing uniqueId as customerId
      amount,
      currency,
      status: 'active',
      startDate: subscriptionStartDate,
      endDate: new Date(razorpaySubscription.end_at * 1000),
      nextPaymentDate, // Calculated next payment date
    });

    await newSubscription.save();

    return res.status(201).json({
      message: 'Subscription created successfully!',
      subscription: newSubscription,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription', error: error.message });
  }
});

module.exports = router;
