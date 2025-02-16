const express = require('express');
// const bcrypt = require('bcrypt');
const User = require('../model/User'); // Ensure this path is correct

const router = express.Router();

// POST to create a new user
router.post('/create', async (req, res) => {
    const { 
        servicename, 
        phone, 
        ownername,
        personalEmail,
        about, 
        address, 
        rating, 
        reviewsCount, 
        serviceTypes,
        reviews, 
        serviceAreaPincodes,
        password, // Accept plain password from the request body
        businesslocation 
    } = req.body;

    try {
        // Check if a user already exists with this email
        const existingUser = await User.findOne({ personalEmail });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        // Validate Password
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        // Generate a unique ID
        const { nanoid } = await import('nanoid');
        const uniqueId = nanoid(20);

        // Create a new user object
        const newUser = new User({
            uniqueId,
            servicename,
            phone,
            ownername,
            personalEmail,
            about,
            address,
            rating,
            reviewsCount,
            serviceTypes,
            serviceAreaPincodes,
            businesslocation, 
            reviews,
            password // Store the plain text password
        });

        // Save the user to the database
        const savedUser = await newUser.save();

        // Remove sensitive fields like password from the response
        // const { password, ...userWithoutPassword } = savedUser.toObject();
        res.status(201).json(savedUser);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/demoservicecreate', async (req, res) => {
    const { 
        servicename, 
        phone, 
        ownername,
        about, 
        address, 
        rating, 
        reviewsCount, 
        serviceTypes,        // Array of service types
        reviews, 
        serviceAreaPincodes, // Array of pincodes for service area
        businesslocation,    // Business location
        businessAccountStatus, // Account status (e.g. 'active', 'inactive')
        visibleStatus,
        businessPhoneNumbers, // Array of business phone numbers
        businessEmails,      // Array of business emails
        businessName,         // Name of the business
        subscriptionStatus,
        orderType,            // Type of the order (e.g. 'online', 'offline')
        orderStatus,          // Status of the order (e.g. 'pending', 'completed')
        orderid,              // Unique order identifier
        subscriptionType,     // Type of subscription (e.g. 'basic', 'premium')
        subscriptionId,       // Unique subscription identifier
        createdAt,            // Creation timestamp
        updatedAt             // Updated timestamp
    } = req.body;

    try {
        // Generate a unique ID
        const { nanoid } = await import('nanoid');
        const uniqueId = nanoid(20);

        // Create a new service object with the added fields
        const newService = new User({
            uniqueId,
            personalEmail: uniqueId, // Store uniqueId in personalEmail
            servicename,
            phone,
            ownername,
            about,
            address,
            rating,
            reviewsCount,
            serviceTypes,           // Storing the service types
            serviceAreaPincodes,    // Storing service area pincodes
            businesslocation,       // Storing business location
            reviews,
            businessAccountStatus, // Storing business account status
            visibleStatus,
            businessPhoneNumbers,  // Storing business phone numbers
            businessEmails,        // Storing business emails
            businessName,           // Storing business name
            subscriptionStatus,
            orderType,              // Storing order type
            orderStatus,            // Storing order status
            orderid,                // Storing unique order id
            subscriptionType,       // Storing subscription type
            subscriptionId,         // Storing unique subscription id
            createdAt,              // Storing creation timestamp
            updatedAt               // Storing updated timestamp
        });

        // Save the service to the database
        const savedService = await newService.save();

        // Return the saved service
        res.status(201).json(savedService);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});



// POST to login
router.post('/login', async (req, res) => {
    const { personalEmail, password } = req.body;

    try {
        // Validate input
        if (!personalEmail || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Check if the user exists
        const user = await User.findOne({ personalEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Compare the provided password with the stored password
        if (password !== user.password) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Remove sensitive fields from the response
        const { password: _, ...userWithoutPassword } = user.toObject();

        // Respond with user details
        res.status(200).json(userWithoutPassword);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// GET users by serviceTypes and serviceAreaPincodes with pagination
router.post('/search', async (req, res) => {
    const { serviceTypes, serviceAreaPincodes, offset = 0, limit = 50 } = req.body;

    if (!serviceTypes || !serviceAreaPincodes) {
        return res.status(400).json({ message: 'Both serviceTypes and serviceAreaPincodes are required.' });
    }

    try {
        if (!Array.isArray(serviceTypes) || !Array.isArray(serviceAreaPincodes)) {
            return res.status(400).json({ message: 'Both serviceTypes and serviceAreaPincodes must be arrays.' });
        }

        let allUsers = [];

        for (let pincode of serviceAreaPincodes) {
            let parts = pincode.split(',');
            let partialPincodes = [];

            while (parts.length > 0) {
                partialPincodes.push(parts.join(',').trim());
                parts.pop();
            }

            for (let partialPincode of partialPincodes) {
                // Fetch active users first
                const activeUsers = await User.find({
                    serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) },
                    serviceAreaPincodes: { $in: [partialPincode] },
                    visibleStatus: true,
                    $or: [{ orderStatus: "active" }, { subscriptionStatus: "active" }]
                });

                // Fetch remaining inactive users
                const otherUsers = await User.find({
                    serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) },
                    serviceAreaPincodes: { $in: [partialPincode] },
                    visibleStatus: true,
                    $and: [
                        { orderStatus: { $not: { $eq: "active" } } },
                        { subscriptionStatus: { $not: { $eq: "active" } } }
                    ]
                });

                // Merge active and inactive users
                allUsers = [...allUsers, ...activeUsers, ...otherUsers];
            }
        }

        if (allUsers.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        // Remove duplicates based on uniqueId
        const uniqueUsers = [...new Map(allUsers.map(user => [user.uniqueId, user])).values()];

        // ✅ Apply pagination AFTER removing duplicates
        const paginatedUsers = uniqueUsers.slice(offset, offset + limit);

        res.status(200).json({
            users: paginatedUsers,
            hasMore: offset + limit < uniqueUsers.length, // ✅ Returns if more pages are available
            totalCount: uniqueUsers.length // ✅ Optional: Total user count before pagination
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// GET users by serviceTypes, serviceAreaPincodes, and servicename with pagination
router.post('/type-search', async (req, res) => {
    const { serviceTypes, serviceAreaPincodes, servicename, offset = 0, limit = 50 } = req.body;

    if ((!serviceTypes || !serviceAreaPincodes) && !servicename) {
        return res.status(400).json({ message: 'Either servicename or both serviceTypes and serviceAreaPincodes are required.' });
    }

    try {
        if ((serviceTypes && !Array.isArray(serviceTypes)) || (serviceAreaPincodes && !Array.isArray(serviceAreaPincodes))) {
            return res.status(400).json({ message: 'serviceTypes and serviceAreaPincodes must be arrays if provided.' });
        }

        let allUsers = [];

        if (servicename) {
            // Fetch users by servicename, serviceTypes, and serviceAreaPincodes (partial and case-insensitive search)
            allUsers = await User.find({
                servicename: { $regex: new RegExp(servicename, 'i') },
                serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) },
                serviceAreaPincodes: { $in: serviceAreaPincodes },
                visibleStatus: true
            });
        } else {
            for (let pincode of serviceAreaPincodes) {
                let parts = pincode.split(',');
                let partialPincodes = [];

                while (parts.length > 0) {
                    partialPincodes.push(parts.join(',').trim());
                    parts.pop();
                }

                for (let partialPincode of partialPincodes) {
                    // Fetch active users first
                    const activeUsers = await User.find({
                        serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) },
                        serviceAreaPincodes: { $in: [partialPincode] },
                        visibleStatus: true,
                        $or: [{ orderStatus: "active" }, { subscriptionStatus: "active" }]
                    });

                    // Fetch remaining inactive users
                    const otherUsers = await User.find({
                        serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) },
                        serviceAreaPincodes: { $in: [partialPincode] },
                        visibleStatus: true,
                        $and: [
                            { orderStatus: { $not: { $eq: "active" } } },
                            { subscriptionStatus: { $not: { $eq: "active" } } }
                        ]
                    });

                    // Merge active and inactive users
                    allUsers = [...allUsers, ...activeUsers, ...otherUsers];
                }
            }
        }

        if (allUsers.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        // Remove duplicates based on uniqueId
        const uniqueUsers = [...new Map(allUsers.map(user => [user.uniqueId, user])).values()];

        // ✅ Apply pagination AFTER removing duplicates
        const paginatedUsers = uniqueUsers.slice(offset, offset + limit);

        res.status(200).json({
            users: paginatedUsers,
            hasMore: offset + limit < uniqueUsers.length, // ✅ Returns if more pages are available
            totalCount: uniqueUsers.length // ✅ Optional: Total user count before pagination
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET users by serviceTypes (Removing serviceAreaPincodes filter)
router.post('/search-all', async (req, res) => {
    const { serviceTypes, offset = 0, limit = 50 } = req.body;

    if (!serviceTypes || !Array.isArray(serviceTypes)) {
        return res.status(400).json({ message: 'serviceTypes must be a non-empty array.' });
    }

    try {
        let allUsers = [];

        // 1️⃣ Fetch active users first (orderStatus OR subscriptionStatus is "active")
        const activeUsers = await User.find({
            serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) },
            visibleStatus: true,
            $or: [{ orderStatus: "active" }, { subscriptionStatus: "active" }]
        });

        // 2️⃣ Fetch remaining users who don't have "active" status (inactive OR null)
        const otherUsers = await User.find({
            serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) },
            visibleStatus: true,
            $and: [
                { orderStatus: { $not: { $eq: "active" } } },
                { subscriptionStatus: { $not: { $eq: "active" } } }
            ]
        });

        // Merge both lists (active users first, then others)
        allUsers = [...activeUsers, ...otherUsers];

        if (allUsers.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        // Remove duplicates based on uniqueId
        const uniqueUsers = [...new Map(allUsers.map(user => [user.uniqueId, user])).values()];

        // Apply offset and limit
        const paginatedUsers = uniqueUsers.slice(offset, offset + limit);

        res.status(200).json({
            total: uniqueUsers.length,
            offset,
            limit,
            users: paginatedUsers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// GET all visible users
router.get('/visible-users', async (req, res) => {
    try {
        const visibleUsers = await User.find({ visibleStatus: true });

        if (visibleUsers.length === 0) {
            return res.status(404).json({ message: 'No visible users found' });
        }

        res.status(200).json(visibleUsers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


router.put('/businessverification', async (req, res) => {
    const { personalEmail, servicename, businessPhoneNumbers, businessEmails, about, address, businesslocation } = req.body;
    
  
    if (!personalEmail || !servicename || !businessPhoneNumbers || !businessEmails || !about || !address) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        const user = await User.findOneAndUpdate(
            { personalEmail: personalEmail },
            {
                $set: {
                    servicename: servicename,
                    businessPhoneNumbers: businessPhoneNumbers,
                    businessEmails: businessEmails,
                    about: about,
                    address: address,
                    businesslocation: businesslocation,
                    businessAccountStatus: true,
                    visibleStatus: true
                }
            },
            { new: true}
        );
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'Business details updated successfully', user });
    } catch (error) {

        res.status(500).json({ message: 'Error updating business details', error });
    }

});

// PUT to update serviceAreaPincodes for a user using personalEmail number
router.put('/update/pincodes', async (req, res) => {
    const { personalEmail, serviceAreaPincodes } = req.body; // Use personalEmail from the request body

    // Ensure personalEmail number and serviceAreaPincodes are provided
    if (!personalEmail || !serviceAreaPincodes || !Array.isArray(serviceAreaPincodes)) {
        return res.status(400).json({ message: 'personalEmail and serviceAreaPincodes must be provided and serviceAreaPincodes must be an array.' });
    }

    try {
        // Update the user in the database
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail }, 
            { serviceAreaPincodes }, 
            { new: true } // Return the updated document
        );

        // Check if the user was found
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user
        res.status(200).json(updatedUser);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// Update servicename
router.put('/update/servicename', async (req, res) => {
    const { personalEmail, servicename } = req.body;

    if (!personalEmail || !servicename) {
        return res.status(400).json({ message: 'personalEmail and servicename must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { servicename },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/update/businessaddress', async (req, res) => {
    const { personalEmail, businesslocation } = req.body;

    // Validate the required fields
    if (!personalEmail || !businesslocation) {
        return res.status(400).json({ message: 'personalEmail and businesslocation with Latitude and Longitude must be provided.' });
    }

    try {
        // Find the user by personalEmail and update the businesslocation
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { businesslocation }, // Update the business location
            { new: true } // Return the updated document
        );

        // If no user was found
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user object
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// Update ownername
router.put('/update/ownername', async (req, res) => {
    const { personalEmail, ownername } = req.body;

    if (!personalEmail || !ownername) {
        return res.status(400).json({ message: 'personalEmail and ownername must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { ownername },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update personal phone
router.put('/update/phone', async (req, res) => {
    const { personalEmail, phone } = req.body;

    // Validate input
    if (!personalEmail || !phone) {
        return res.status(400).json({ message: 'personalEmail and phone must be provided.' });
    }

    try {
        // Update the user's personal email
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { phone },
            { new: true }
        );

        // Check if the user was found
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// Update serviceUrl
router.put('/update/serviceUrl', async (req, res) => {
    const { personalEmail, serviceUrl } = req.body;

    if (!personalEmail || !serviceUrl) {
        return res.status(400).json({ message: 'personalEmail and serviceUrl must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { serviceUrl },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update address
router.put('/update/address', async (req, res) => {
    const { personalEmail, address } = req.body;

    if (!personalEmail || !address) {
        return res.status(400).json({ message: 'personalEmail and address must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { address },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update rating
router.put('/update/rating', async (req, res) => {
    const { personalEmail, rating } = req.body;

    if (!personalEmail || typeof rating !== 'number') {
        return res.status(400).json({ message: 'personalEmail and a numeric rating must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { rating },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update reviewsCount
router.put('/update/reviewsCount', async (req, res) => {
    const { personalEmail, reviewsCount } = req.body;

    if (!personalEmail || typeof reviewsCount !== 'number') {
        return res.status(400).json({ message: 'personalEmail and a numeric reviewsCount must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { reviewsCount },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update serviceTypes
router.put('/update/serviceTypes', async (req, res) => {
    const { personalEmail, serviceTypes } = req.body;

    if (!personalEmail || !Array.isArray(serviceTypes)) {
        return res.status(400).json({ message: 'personalEmail and serviceTypes array must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { serviceTypes },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// PUT to add a new review, increment reviewsCount, and update average rating
router.put('/update/reviews', async (req, res) => {
    const { personalEmail, uniqueId, reviewerName, rating, comment } = req.body; // Single new review

    // Validate required fields
    if ((!personalEmail && !uniqueId) || !reviewerName || typeof rating !== 'number' || !comment) {
        return res.status(400).json({ message: 'personalEmail or uniqueId, reviewerName, rating, and comment are required.' });
    }

    try {
        // Find the user using either personalEmail or uniqueId
        const query = personalEmail ? { personalEmail } : { uniqueId };
        const user = await User.findOne(query);

        // Check if user was found
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add the new review and increment reviewsCount
        user.reviews.push({ reviewerName, rating, comment });
        user.reviewsCount += 1;

        // Calculate the new average rating
        const totalRatings = user.reviews.reduce((sum, review) => sum + review.rating, 0);
        user.rating = totalRatings / user.reviews.length;

        // Save the updated user
        await user.save();

        // Return the updated user with new average rating
        res.status(200).json(user);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST to fetch reviews for a user with pagination
router.post('/getReviewsByUser', async (req, res) => {
    const { personalEmail, offset = 0, limit = 10 } = req.body; // Email, offset, and limit from the body

    // Validate the request body
    if (!personalEmail) {
        return res.status(400).json({ message: 'personalEmail is required.' });
    }

    try {
        // Find the user by email
        const user = await User.findOne({ personalEmail }, { reviews: 1, _id: 0 }); // Fetch only reviews field

        // Check if user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Extract reviews and apply pagination
        const totalReviews = user.reviews.length; // Total number of reviews
        const paginatedReviews = user.reviews.slice(offset, offset + limit); // Get reviews based on offset and limit

        // Return paginated reviews and total count
        res.status(200).json({
            reviews: paginatedReviews,
            total: totalReviews,
            hasMore: offset + limit < totalReviews, // Whether there are more reviews to load
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


// GET user by phone number
router.post('/getBypersonalEmail', async (req, res) => {
    const { personalEmail } = req.body; // Use query parameter

    // Ensure phone number is provided
    if (!personalEmail) {
        return res.status(400).json({ message: 'personalEmail is required.' });
    }

    try {
        // Find the user based on phone number
        const user = await User.findOne({ personalEmail });

        // Check if the user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the user data
        res.status(200).json(user);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update businessAccountStatus
router.put('/update/visibleStatus', async (req, res) => {
    const { personalEmail, visibleStatus } = req.body;

    // Validate that phone and visibleStatus are provided
    if (!personalEmail || typeof visibleStatus !== 'boolean') {
        return res.status(400).json({ message: 'personalEmail and visibleStatus (true or false) must be provided.' });
    }

    try {
        // Find the user and update the visibleStatus
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { visibleStatus },
            { new: true } // Return the updated document
        );

        // Check if the user was found and updated
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT to update business name
router.put('/update/businessName', async (req, res) => {
    const { personalEmail, businessName } = req.body;

    if (!personalEmail || !businessName) {
        return res.status(400).json({ message: 'personalEmail and businessName must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { businessName },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT to update business emails
router.put('/update/businessEmails', async (req, res) => {
    const { personalEmail, businessEmails } = req.body;

    // Ensure businessEmails is an array
    if (!personalEmail || !Array.isArray(businessEmails)) {
        return res.status(400).json({ message: 'personalEmail and businessEmails must be provided as an array.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { businessEmails },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT to update business phone numbers
router.put('/update/businessPhoneNumbers', async (req, res) => {
    const { personalEmail, businessPhoneNumbers } = req.body;

    // Ensure businessPhoneNumbers is an array
    if (!personalEmail || !Array.isArray(businessPhoneNumbers)) {
        return res.status(400).json({ message: 'personalEmail and businessPhoneNumbers must be provided as an array.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { businessPhoneNumbers },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Update about
router.put('/update/about', async (req, res) => {
    const { personalEmail, about } = req.body;

    // Validate input
    if (!personalEmail || !about) {
        return res.status(400).json({ message: 'personalEmail and about must be provided.' });
    }

    try {
        // Update the user's about field
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
            { about },
            { new: true } // Return the updated document
        );

        // Check if the user was found
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }

});

    // POST to add a new news item
    router.post('/add/news', async (req, res) => {
        const { personalEmail, uniqueId, title, subtitle, content } = req.body; // New news details
    
        // Validate required fields
        if ((!personalEmail && !uniqueId) || !title || !content) {
            return res.status(400).json({ message: 'personalEmail or uniqueId, title, and content are required.' });
        }
    
        try {
            // Find the user using either personalEmail or uniqueId
            const query = personalEmail ? { personalEmail } : { uniqueId };
            const user = await User.findOne(query);
    
            // Check if user was found
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
    
            // Generate a unique ID
            const { nanoid } = await import('nanoid');
            const newsuniqueId = nanoid(20);
    
            // Calculate expiry date (7 days from the current date)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7); // Add 7 days to the current date
    
            // Add the new news item with expiryDate
            const newNews = { newsuniqueId, title, subtitle, content, expiryDate };
            user.news.push(newNews);
    
            // Save the updated user
            await user.save();
    
            // Return the updated user with the new news item
            res.status(200).json(user);
    
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Server Error' });
        }
    });    

// DELETE to remove a news item
router.delete('/delete/news', async (req, res) => {
    const { personalEmail, uniqueId, newsuniqueId } = req.body;

    // Validate required fields
    if ((!personalEmail && !uniqueId) || !newsuniqueId) {
        return res.status(400).json({ message: 'personalEmail or uniqueId, and newsuniqueId are required.' });
    }

    try {
        // Find the user using either personalEmail or uniqueId
        const query = personalEmail ? { personalEmail } : { uniqueId };
        const user = await User.findOne(query);

        // Check if user was found
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the index of the news item to delete
        const newsIndex = user.news.findIndex(news => news.newsuniqueId === newsuniqueId);
        if (newsIndex === -1) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Remove the news item
        user.news.splice(newsIndex, 1);

        // Save the updated user
        await user.save();

        res.status(200).json({ message: 'News item deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT to edit a news item
router.put('/edit/news', async (req, res) => {
    const { personalEmail, uniqueId, newsuniqueId, title, subtitle, content } = req.body;

    // Validate required fields
    if ((!personalEmail && !uniqueId) || !newsuniqueId || (!title && !subtitle && !content)) {
        return res.status(400).json({ message: 'personalEmail or uniqueId, newsuniqueId, and at least one field to update (title, subtitle, content) are required.' });
    }

    try {
        // Find the user using either personalEmail or uniqueId
        const query = personalEmail ? { personalEmail } : { uniqueId };
        const user = await User.findOne(query);

        // Check if user was found
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the news item to edit
        const newsItem = user.news.find(news => news.newsuniqueId === newsuniqueId);
        if (!newsItem) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Update the fields if they are provided
        if (title) newsItem.title = title;
        if (subtitle) newsItem.subtitle = subtitle;
        if (content) newsItem.content = content;

        // Save the updated user
        await user.save();

        res.status(200).json({
            message: 'News item updated successfully',
            news: newsItem,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET news items for a user
router.post('/get/news', async (req, res) => {
    const { personalEmail, uniqueId } = req.body; // Get body parameters

    // Validate required fields
    if (!personalEmail && !uniqueId) {
        return res.status(400).json({ message: 'personalEmail or uniqueId is required.' });
    }

    try {
        // Find the user using either personalEmail or uniqueId
        const query = personalEmail ? { personalEmail } : { uniqueId };
        const user = await User.findOne(query);

        // Check if user was found
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Extract only the required fields from the news array
        const simplifiedNews = user.news.map(news => ({
            newsuniqueId: news.newsuniqueId,
            title: news.title,
            subtitle: news.subtitle,
        }));

        // Return the simplified news array
        res.status(200).json({
            message: 'News items fetched successfully',
            news: simplifiedNews
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});


module.exports = router;
