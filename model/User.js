const mongoose = require('mongoose');

// Define the Review sub-schema
const ReviewSchema = new mongoose.Schema({
    reviewerName: { type: String, required: true }, // Name of the reviewer
    rating: { type: Number, required: true, min: 0, max: 5 }, // Rating given by the reviewer (0 to 5)
    comment: { type: String, required: true }, // Review comment
    date: { type: Date, default: Date.now } // Date of the review
});

// Define the User schema
const UserSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true, unique: true },
    servicename: { type: String },
    phone: { type: String },
    ownername: { type: String, default: "GoloZap" },
    personalEmail: { type: String, unique: true },
    serviceUrl: { type: String },
    about: { type: String },
    address: { type: String },
    businessName: { type: String}, // Added business name
    businessEmails: { type: [String], unique: true }, // Array of business emails
    businessPhoneNumbers: { type: [String]}, // Array of business phone numbers
    businessAccountStatus: { type: Boolean, default: false }, // Account status as true or false
    rating: { type: Number, default: 0, min: 0, max: 5 }, // Average rating (between 0 and 5)
    reviewsCount: { type: Number, default: 0 }, // Total number of reviews
    serviceTypes: { type: [String] }, // Array of service types (e.g., ['Plumbing', 'Electrical'])
    serviceAreaPincodes: { type: [String] }, // Array of pincodes representing the service area
    reviews: [ReviewSchema], // Array of reviews
    businesslocation: { 
        Latitude: { type: Number }, // Latitude
        Longitude: { type: Number } // Longitude
    }
});

// Export the User model
module.exports = mongoose.model('User', UserSchema);
