const mongoose = require('mongoose');

const subDistrictSchema = new mongoose.Schema({
  subDistrict: {
    type: String,
    required: true, 
  },
  villages: { type: [String] }, 
});

const districtSchema = new mongoose.Schema({
  district: {
    type: String,
    required: true,
  },
  subDistricts: [subDistrictSchema], 
});

const stateSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
  },
  districts: [districtSchema], 
});

module.exports = mongoose.model('State', stateSchema);
