require('dotenv').config(); // Load environment variables

const express = require('express');
const RazorpaySubscription = require('../model/RazorpaySubscription'); // Import the subscription model
const { RazorpayOrder } = require('../model/RazorpayOrder'); // Model to store order details
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
    user.subscriptionType = 'Basic';
    user.orderType = null;
    user.orderStatus = null;
    user.orderid = null;
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

router.post('/add_premium_subscription', async (req, res) => {
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
    const planId = req.body.planId || 'plan_PlIVykx48qHLAr'; // Replace with your default Plan ID
    const amount = req.body.amount || 11900; // Default amount in paise (e.g., 119.0 INR)
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
    user.subscriptionType = 'Premium';
    user.orderType = null;
    user.orderStatus = null;
    user.orderid = null;
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

router.post('/add_premium_pro_subscription', async (req, res) => {
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
    const planId = req.body.planId || 'plan_PlIY4iwXxYVGDB'; // Replace with your default Plan ID
    const amount = req.body.amount || 39000; // Default amount in paise (e.g., 390.0 INR)
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
    user.subscriptionType = 'Premium Pro';
    user.orderType = null;
    user.orderStatus = null;
    user.orderid = null;
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

router.post('/create_basic_one_time_purchase', async (req, res) => {
  try {
    const { personalEmail, uniqueId } = req.body;

    // Validate input
    if (!personalEmail || !uniqueId) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Verify user
    const user = await User.findOne({ personalEmail, uniqueId });
    if (!user) {
      return res.status(404).json({ message: 'User not found with provided email and uniqueId' });
    }

    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
    // Razorpay order options
    const orderOptions = {
      amount: 309 * 100, // Razorpay accepts amount in paise (e.g., 500 INR -> 50000 paise)
      currency: 'INR', // Default to INR
      receipt: `order_rcptid_${uniqueId}`, // Unique receipt ID
      payment_capture: 1, // Automatically capture payment
    };

    // Create order in Razorpay
    const order = await razorpay.orders.create(orderOptions);

     // Save order details in the database
     const newOrder = new RazorpayOrder({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      createdAt: new Date(order.created_at * 1000), // Convert UNIX timestamp to Date
      expiryDate, // Set expiry date to 1 year later
      userId: user.uniqueId, // Store user's uniqueId
    });

    await newOrder.save();

    // Update the user's orderId field in the User collection
    user.subscriptionId = null;
    user.subscriptionStatus = null;
    user.subscriptionType = null;
    user.orderType = "Basic";
    user.orderStatus = "active";
    user.orderid = order.id;
    await user.save();

    // Respond with order details
    res.status(201).json({
      message: 'Order created successfully!',
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      createdAt: newOrder.createdAt,
      expiryDate, // Return expiry date in the response
    });
  } catch (error) {
    console.error('Error creating one-time purchase order:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

router.post('/create_premium_one_time_purchase', async (req, res) => {
  try {
    const { personalEmail, uniqueId } = req.body;

    // Validate input
    if (!personalEmail || !uniqueId) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Verify user
    const user = await User.findOne({ personalEmail, uniqueId });
    if (!user) {
      return res.status(404).json({ message: 'User not found with provided email and uniqueId' });
    }

    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
    // Razorpay order options
    const orderOptions = {
      amount: 1188 * 100, // Razorpay accepts amount in paise (e.g., 500 INR -> 50000 paise)
      currency: 'INR', // Default to INR
      receipt: `order_rcptid_${uniqueId}`, // Unique receipt ID
      payment_capture: 1, // Automatically capture payment
    };

    // Create order in Razorpay
    const order = await razorpay.orders.create(orderOptions);

     // Save order details in the database
     const newOrder = new RazorpayOrder({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      createdAt: new Date(order.created_at * 1000), // Convert UNIX timestamp to Date
      expiryDate, // Set expiry date to 1 year later
      userId: user.uniqueId, // Store user's uniqueId
    });

    await newOrder.save();

    // Update the user's orderId field in the User collection
    user.subscriptionId = null;
    user.subscriptionStatus = null;
    user.subscriptionType = null;
    user.orderType = "Premium";
    user.orderStatus = "active";
    user.orderid = order.id;
    await user.save();

    // Respond with order details
    res.status(201).json({
      message: 'Order created successfully!',
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      createdAt: newOrder.createdAt,
      expiryDate, // Return expiry date in the response
    });
  } catch (error) {
    console.error('Error creating one-time purchase order:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

router.post('/create_premium_pro_one_time_purchase', async (req, res) => {
  try {
    const { personalEmail, uniqueId } = req.body;

    // Validate input
    if (!personalEmail || !uniqueId) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Verify user
    const user = await User.findOne({ personalEmail, uniqueId });
    if (!user) {
      return res.status(404).json({ message: 'User not found with provided email and uniqueId' });
    }

    // Calculate expiry date (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  
    // Razorpay order options
    const orderOptions = {
      amount: 4150 * 100, // Razorpay accepts amount in paise (e.g., 500 INR -> 50000 paise)
      currency: 'INR', // Default to INR
      receipt: `order_rcptid_${uniqueId}`, // Unique receipt ID
      payment_capture: 1, // Automatically capture payment
    };

    // Create order in Razorpay
    const order = await razorpay.orders.create(orderOptions);

     // Save order details in the database
     const newOrder = new RazorpayOrder({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      createdAt: new Date(order.created_at * 1000), // Convert UNIX timestamp to Date
      expiryDate, // Set expiry date to 1 year later
      userId: user.uniqueId, // Store user's uniqueId
    });

    await newOrder.save();

    // Update the user's orderId field in the User collection
    user.subscriptionId = null;
    user.subscriptionStatus = null;
    user.subscriptionType = null;
    user.orderType = "Premium Pro";
    user.orderStatus = "active";
    user.orderid = order.id;
    await user.save();

    // Respond with order details
    res.status(201).json({
      message: 'Order created successfully!',
      orderId: order.id,
      amount: order.amount / 100,
      currency: order.currency,
      createdAt: newOrder.createdAt,
      expiryDate, // Return expiry date in the response
    });
  } catch (error) {
    console.error('Error creating one-time purchase order:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

// Cancel subscription API with user verification
router.post('/cancel_subscription', async (req, res) => {
  try {
    const { personalEmail, uniqueId, subscriptionId } = req.body;

    // Validate inputs
    if (!personalEmail || !uniqueId || !subscriptionId) {
      return res.status(400).json({
        message: 'All required fields (personalEmail, uniqueId, subscriptionId) must be provided',
      });
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

    // Update the subscription status in your RazorpaySubscription collection
    subscription.status = 'canceled';
    await subscription.save();

    // Update the subscription status in the User collection
    user.subscriptionStatus = 'canceled';
    await user.save();

    return res.status(200).json({
      message: 'Subscription canceled successfully!',
      razorpayResponse,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      message: 'Failed to cancel subscription',
      error: error.message,
    });
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

router.post('/find-order-type', async (req, res) => {
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

    // Extract and return the Order details
    const { orderType, orderStatus, orderid } = user;
    return res.status(200).json({
      message: 'Order details fetched successfully',
      orderDetails: {
        orderType,
        orderStatus,
        orderid,
      },
    });
  } catch (error) {
    console.error('Error fetching Order details:', error);
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
    razorpay.subscriptions.fetch(subscriptionId)
      .then((subscription) => {
        // Log the full subscription data for debugging
        // console.log('Full Subscription Data:', subscription);

        const amount = subscription.amount ? subscription.amount / 100 : null;  // Convert to main currency unit or set to null

        // Extract and format the necessary details
        const subscriptionDetails = {
          subscriptionStatus: subscription.status,    // Status of the subscription (e.g., active, expired)
          subscriptionId: subscription.id,             // Unique ID of the subscription
          createdAt: new Date(subscription.created_at * 1000).toLocaleString(),  // Convert Unix timestamp to a readable date
          nextPaymentDate: new Date(subscription.charge_at * 1000).toLocaleString(),  // Next payment date
          amount: amount,
          expiryDate: subscription.expire_by ? new Date(subscription.expire_by * 1000).toLocaleString() : 'Not Available', // Expiry date if available
          paymentMethod: subscription.payment_method,  // Payment method (e.g., UPI, card, etc.)
          totalCount: subscription.total_count,        // Total number of cycles/payments
          paidCount: subscription.paid_count,          // Number of payments made
          remainingCount: subscription.remaining_count,  // Number of remaining payments
        };

        // Return the subscription details in the response
        return res.status(200).json({
          message: 'Subscription details fetched successfully',
          subscriptionDetails,
        });
      })
      .catch((error) => {
        console.error('Error fetching subscription details from Razorpay:', error);
        return res.status(500).json({ message: 'An error occurred while fetching subscription details', error: error.message });
      });
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

router.post('/fetch-order-details', async (req, res) => {
  try {
    const { orderId } = req.body;

    // Validate input
    if (!orderId) {
      return res.status(400).json({ message: 'Missing required orderId' });
    }

    // Fetch order details from Razorpay using the orderId
    const order = await razorpay.orders.fetch(orderId);

    // Log the full order data for debugging
    // console.log('Full Order Data:', order);

    const amount = order.amount ? order.amount / 100 : null; // Convert to main currency unit
    const amountPaid = order.amount_paid ? order.amount_paid / 100 : null;

    // Fetch payment details for the order
    const payments = await razorpay.orders.fetchPayments(orderId);
    const paymentMethod =
      payments.items && payments.items.length > 0
        ? payments.items[0].method
        : 'N/A'; // Use the first payment method or default to "N/A"

    // Extract and format the necessary details
    const orderDetails = {
      orderStatus: order.status, // Status of the order (e.g., created, paid)
      orderId: order.id, // Unique ID of the order
      createdAt: new Date(order.created_at * 1000).toLocaleString(), // Convert Unix timestamp to a readable date
      amount: amount, // Total amount of the order
      amountPaid: amountPaid, // Paid amount
      currency: order.currency, // Currency of the order
      receipt: order.receipt, // Receipt associated with the order
      notes: order.notes, // Any additional notes in the order
      paymentMethod: paymentMethod, // Actual payment method (e.g., card, upi, netbanking)
    };

    // Return the order details in the response
    return res.status(200).json({
      message: 'Order details fetched successfully',
      orderDetails,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({ message: 'An error occurred', error: error.message });
  }
});

module.exports = router;