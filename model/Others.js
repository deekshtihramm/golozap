const mongoose = require('mongoose');

const OthersSchema = new mongoose.Schema({
  update: { type: String },
  totalUsers: { type: Number, default: 0 },
  totalProviders: { type: Number, default: 0 },
  lastHourProviders: { type: Number, default: 0 },
  lastDayRegistrations: { type: Number, default: 0 },
  lastMonthRegistrations: { type: Number, default: 0 },
  totalInstalls: { type: Number, default: 0 },
  lastDayInstalls: { type: Number, default: 0 },
  lastMonthInstalls: { type: Number, default: 0 },
  topServices: [{ type: String }],
  activeUsers: { type: Number, default: 0 },
  newProvidersLastWeek: { type: Number, default: 0 },
  mostSearchedServices: [{ type: String }],
  mostActiveLocations: [{ type: String }],
});

module.exports.Others = mongoose.model('Others', OthersSchema);
