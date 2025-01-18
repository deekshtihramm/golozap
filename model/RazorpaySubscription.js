const mongoose = require('mongoose');

// Define the Subscription schema
const RazorpaySubscriptionSchema = new mongoose.Schema({
    subscriptionId: { type: String, required: true, unique: true },  // Razorpay subscription ID
    planId: { type: String, required: true },  // Razorpay plan ID associated with the subscription
    customerId: { type: String, required: true },  // Customer ID (could be a user reference)
    amount: { type: Number, required: true },  // Amount (in paise)
    currency: { type: String, required: true },  // Currency (e.g., INR)
    status: { 
        type: String, 
        required: true, 
        enum: ['active', 'canceled', 'expired', 'failed'], 
        default: 'active' 
    },  // Status of the subscription
    startDate: { type: Date, required: true },  // Subscription start date
    endDate: { type: Date },  // Subscription end date
    nextPaymentDate: { type: Date, required: true },  // Date when the next payment will be charged
    paymentLink: { type: String, required: false },  // Store the Razorpay payment link
    createdAt: { type: Date, default: Date.now },  // Timestamp when the subscription was created
    updatedAt: { type: Date, default: Date.now },  // Timestamp for any updates on the subscription
}, { versionKey: false, timestamps: true });  // Auto timestamps for createdAt and updatedAt

// Create a model using the schema
const RazorpaySubscription = mongoose.model('RazorpaySubscription', RazorpaySubscriptionSchema);

module.exports = RazorpaySubscription;
