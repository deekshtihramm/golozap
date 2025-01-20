const mongoose = require('mongoose');

const RazorpayOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  userId: { type: String, required: true }, 
});

module.exports.RazorpayOrder = mongoose.model('RazorpayOrder', RazorpayOrderSchema);
