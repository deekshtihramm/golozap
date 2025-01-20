const mongoose = require('mongoose');

const RazorpayOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  status: { type: String, required: true }, // e.g., 'created'
  createdAt: { type: Date, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports.RazorpayOrder = mongoose.model('RazorpayOrder', RazorpayOrderSchema);
