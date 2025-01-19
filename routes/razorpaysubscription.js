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

    // Set startDate to 5 minutes from now to ensure it's in the future
    const startDate = new Date();
    startDate.setMinutes(startDate.getMinutes() + 5); // Adding 5 minutes to the current time

    // Convert startDate to UNIX timestamp (in seconds)
    const startAtTimestamp = Math.floor(startDate.getTime() / 1000);

    // Create Razorpay subscription
    const subscriptionOptions = {
      plan_id: planId, // Plan ID from Razorpay
      total_count: total_count || 12, // Default to 12 payments if not provided
      customer_notify: 1, // Notify customer via email/SMS
      start_at: startAtTimestamp, // Ensure start_at is in the future
      quantity: 1,
    };

    const razorpaySubscription = await razorpay.subscriptions.create(subscriptionOptions);

    // Extract the payment link (if Razorpay provides it)
    const paymentLink = razorpaySubscription.payment_links && razorpaySubscription.payment_links[0]
      ? razorpaySubscription.payment_links[0].short_url
      : null;

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
      paymentLink, // Store the payment link
    });

    await newSubscription.save();

    // Update user data with subscription details
    user.subscriptionId = razorpaySubscription.id;
    user.subscriptionStatus = 'active';
    user.subscriptionType = 'BasicSubscription';
    await user.save();

    return res.status(201).json({
      message: 'Subscription created successfully!',
      subscription: newSubscription,
      paymentLink: paymentLink, // Return the payment link in the response
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    if (error.response) {
      console.error('Razorpay API error details:', error.response);
    }
    res.status(500).json({ message: 'Failed to create subscription', error: error.message });
  }
});


// Cancel subscription API with user verification
router.post('/cancel_basic_subscription', async (req, res) => {
    try {
      const { personalEmail, uniqueId, subscriptionId } = req.body;
  
      // Validate inputs
      if (!personalEmail || !uniqueId || !subscriptionId) {
        return res.status(400).json({ message: 'All required fields (personalEmail, uniqueId, subscriptionId) must be provided' });
      }
  
      // Verify personalEmail and uniqueId in the User collection
      const user = await User.findOne({ personalEmail, uniqueId });
      if (!user) {
        return res.status(404).json({ message: 'User not found with provided email and uniqueId' });
      }
  
      // Fetch the subscription from your database to check if it exists
      const subscription = await RazorpaySubscription.findOne({ subscriptionId });
      if (!subscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }
  
      // Check if the subscription belongs to the verified user (optional, but recommended for security)
      if (subscription.customerId !== uniqueId) {
        return res.status(403).json({ message: 'You do not have permission to cancel this subscription' });
      }
  
      // Call Razorpay API to cancel the subscription
      const razorpayResponse = await razorpay.subscriptions.cancel(subscriptionId);
  
      // Update the subscription status in your database
      subscription.status = 'canceled';
      await subscription.save();
  
      return res.status(200).json({
        message: 'Subscription canceled successfully!',
        razorpayResponse,
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ message: 'Failed to cancel subscription', error: error.message });
    }
  });

  // Get Razorpay subscription details
router.post('/get_subscription_details', async (req, res) => {
  try {
    const { personalEmail, uniqueId } = req.body;

    // Validate inputs
    if (!personalEmail || !uniqueId) {
      return res.status(400).json({ message: 'All required fields (personalEmail, uniqueId) must be provided' });
    }

    // Verify personalEmail and uniqueId in the User collection
    const user = await User.findOne({ personalEmail, uniqueId });
    if (!user) {
      return res.status(404).json({ message: 'User not found with provided email and uniqueId' });
    }

    // Fetch the user's active subscription from the database
    const subscription = await RazorpaySubscription.findOne({ customerId: uniqueId, status: 'active' });
    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found for the user' });
    }

    // Fetch Razorpay subscription details using the Razorpay subscription ID
    const razorpaySubscription = await razorpay.subscriptions.fetch(subscription.subscriptionId);

    return res.status(200).json({
      message: 'Subscription details fetched successfully!',
      razorpayId: razorpaySubscription.id,
      subscriptionId: subscription.subscriptionId,
      amount: razorpaySubscription.amount / 100, // Amount is in paise, so convert to INR
    });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    res.status(500).json({ message: 'Failed to fetch subscription details', error: error.message });
  }
});

// Endpoint to create a subscription for the monthly plan
router.post('/create-subscription', async (req, res) => {
  try {
    const { userEmail, planId, amount } = req.body;

    // Validate inputs
    if (!userEmail || !planId || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Creating the subscription on Razorpay
    const subscriptionOptions = {
      plan_id: planId, // Razorpay Plan ID for the monthly plan
      total_count: 12, // Number of payments in the subscription (12 for 1 year)
      customer_notify: 1, // Notify customer via email/SMS
      start_at: Math.floor(new Date().getTime() / 1000), // Start time in UNIX timestamp
      quantity: 1, // For 1 user
    };

    // Create the subscription
    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    // Send the subscription details back to the client
    res.status(200).json({ 
      message: 'Subscription created successfully!',
      subscriptionId: subscription.id,
      subscriptionDetails: subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription', error: error.message });
  }
});

router.post('/find-subscription-type', async (req, res) => {
  try {
    const { uniqueId } = req.body;

    // Validate input
    if (!uniqueId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Verify uniqueId in the User collection
    const user = await User.findOne({ uniqueId });

    if (!user) {
      return res.status(404).json({ message: 'User not found with provided uniqueId' });
    }

    // Extract and return the subscription details
    const { subscriptionType, subscriptionStatus, subscriptionId } = user;
    return res.status(200).json({
      message: 'Subscription details fetched successfully',
      subscriptionDetails: {
        subscriptionType,
        subscriptionStatus,
        subscriptionId,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

router.post('/fetch-subscription-details', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    // Validate input
    if (!subscriptionId) {
      return res.status(400).json({ message: 'Missing required subscriptionId' });
    }

    // Fetch subscription details from Razorpay using the subscriptionId
    razorpay.subscriptions.fetch(subscriptionId).then((subscription) => {
      // Subscription details returned by Razorpay
      return res.status(200).json({
        message: 'Subscription details fetched successfully',
        subscriptionDetails: subscription,
      });
    }).catch((error) => {
      console.error('Error fetching subscription details from Razorpay:', error);
      return res.status(500).json({ message: 'An error occurred', error: error.message });
    });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});



module.exports = router;
