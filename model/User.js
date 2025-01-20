const mongoose = require('mongoose');

// Define the Review sub-schema
const ReviewSchema = new mongoose.Schema({
    reviewerName: { type: String, required: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { versionKey: false });

const NewsSchema = new mongoose.Schema({
    newsuniqueId: { type: String, required: true, unique: true },
    title: { type: String, required: true }, // News title
    subtitle: { type: String }, // Optional news subtitle
    content: { type: String, required: true }, // Main news content
    date: { type: Date, default: Date.now }, // Date the news was created
    expiryDate: { type: Date } // Expiry date for the news item
}, { versionKey: false }); // Disable versioning for the sub-schema

// Define the User Schema
const UserSchema = new mongoose.Schema(
    {
        uniqueId: { type: String, required: true, unique: true },
        servicename: { type: String },
        phone: { type: String },
        ownername: { type: String, default: "GoloZap" },
        personalEmail: { type: String, unique: true },
        serviceUrl: { type: String },
        about: { type: String },
        address: { type: String },
        businessName: { type: String },
        businessEmails: { type: [String] },
        businessPhoneNumbers: { type: [String] },
        businessAccountStatus: { type: Boolean, default: false },
        rating: { type: Number, default: 0, min: 0, max: 5 },
        reviewsCount: { type: Number, default: 0 },
        serviceTypes: { type: [String] },
        serviceAreaPincodes: { type: [String] },
        reviews: [ReviewSchema],
        password: { type: String },
        businesslocation: { type: String },
        news: [NewsSchema], // Array of news items
        item1: { type: String },
        item2: { type: String },
        item3: { type: String },
        item4: { type: String },
        item5: { type: String },
        item6: { type: String },
        item7: { type: String },
        item8: { type: String },
        item9: { type: String },
        item10: { type: String },
        item11: { type: String },
        orderid: { type: String },
        subscriptionType: { type: String },
        subscriptionStatus: { type: String },
        subscriptionId: { type: String }
    },
    {
        timestamps: true,
        versionKey: '__v'
    }
);

// Export the User model
module.exports = mongoose.model('User', UserSchema);
