const express = require('express');
const User = require('../model/User'); // Ensure this path is correct

const router = express.Router();

// POST to create a new user
router.post('/create', async (req, res) => {
    const { 
        servicename, 
        phone, 
        ownername, 
        serviceUrl, 
        about, 
        address, 
        rating, 
        reviewsCount, 
        serviceTypes, 
        locationPincode, 
        reviews, 
        serviceAreaPincodes 
    } = req.body;

    // Ensure locationPincode is an array and has at least one value
    if (!Array.isArray(locationPincode) || locationPincode.length === 0) {
        return res.status(400).json({ message: 'Pincode is required.' });
    }

    try {
        // Check if a user already exists with this phone number
        const existingUser = await User.findOne({ phone });
        
        if (existingUser) {
            return res.status(409).json({ message: 'Account already created with this phone number.' });
        }

        // Import nanoid to generate unique IDs
        const { nanoid } = await import('nanoid');
        const uniqueId = nanoid(20); // Generate a unique 20-character string

        const newUser = new User({
            uniqueId,
            servicename,
            phone,
            ownername,
            serviceUrl,
            about,
            address,
            rating,
            reviewsCount,
            serviceTypes,
            locationPincode, // Store the array of pincodes
            serviceAreaPincodes, // Add service area pincodes from request
            reviews // Accept reviews from the request body
        });

        // Save the user to the database
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET users by serviceTypes and serviceAreaPincodes
router.post('/search', async (req, res) => {
    const { serviceTypes, serviceAreaPincodes } = req.body;

    // Ensure that both serviceTypes and serviceAreaPincodes are provided
    if (!serviceTypes || !serviceAreaPincodes) {
        return res.status(400).json({ message: 'Both serviceTypes and serviceAreaPincodes are required.' });
    }

    try {
        // Validate that both inputs are arrays
        if (!Array.isArray(serviceTypes) || !Array.isArray(serviceAreaPincodes)) {
            return res.status(400).json({ message: 'Both serviceTypes and serviceAreaPincodes must be arrays.' });
        }

        let allUsers = []; // To hold users from all searches

        // Process each pincode for the query logic
        for (let pincode of serviceAreaPincodes) {
            let parts = pincode.split(','); // Split the pincode by commas
            let partialPincodes = [];
            
            // Generate all possible address combinations by progressively removing the last part
            while (parts.length > 0) {
                partialPincodes.push(parts.join(',').trim()); // Join the parts and trim the space
                parts.pop(); // Remove the last part
            }

            // For each address combination (from full address to smallest segment), query users
            for (let partialPincode of partialPincodes) {
                console.log(`Checking for address: ${partialPincode}`);

                const query = {
                    $and: [
                        { serviceTypes: { $in: serviceTypes.map(type => new RegExp(type, 'i')) } }, // Case-insensitive match in serviceTypes
                        { serviceAreaPincodes: { $in: [partialPincode] } } // Match this specific partial address
                    ]
                };

                // Find all users matching the query conditions
                const users = await User.find(query);

                if (users.length > 0) {
                    allUsers = [...allUsers, ...users]; // Accumulate users matching this query
                }
            }
        }

        if (allUsers.length === 0) {
            return res.status(404).json({ message: 'No users found' });
        }

        // Remove duplicates if any (based on the uniqueId)
        const uniqueUsers = [...new Set(allUsers.map(user => user.uniqueId))].map(id => {
            return allUsers.find(user => user.uniqueId === id);
        });

        // Return the found users
        res.status(200).json(uniqueUsers);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});



// PUT to update serviceAreaPincodes for a user using phone number
router.put('/update/pincodes', async (req, res) => {
    const { phone, serviceAreaPincodes } = req.body; // Use phone from the request body

    // Ensure phone number and serviceAreaPincodes are provided
    if (!phone || !serviceAreaPincodes || !Array.isArray(serviceAreaPincodes)) {
        return res.status(400).json({ message: 'Phone and serviceAreaPincodes must be provided and serviceAreaPincodes must be an array.' });
    }

    try {
        // Update the user in the database
        const updatedUser = await User.findOneAndUpdate(
            { phone }, 
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
    const { phone, servicename } = req.body;

    if (!phone || !servicename) {
        return res.status(400).json({ message: 'Phone and servicename must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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

// Update ownername
router.put('/update/ownername', async (req, res) => {
    const { phone, ownername } = req.body;

    if (!phone || !ownername) {
        return res.status(400).json({ message: 'Phone and ownername must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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

// Update personal email
router.put('/update/personalEmail', async (req, res) => {
    const { phone, personalEmail } = req.body;

    // Validate input
    if (!phone || !personalEmail) {
        return res.status(400).json({ message: 'Phone and personalEmail must be provided.' });
    }

    try {
        // Update the user's personal email
        const updatedUser = await User.findOneAndUpdate(
            { phone },
            { personalEmail },
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
    const { phone, serviceUrl } = req.body;

    if (!phone || !serviceUrl) {
        return res.status(400).json({ message: 'Phone and serviceUrl must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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
    const { phone, address } = req.body;

    if (!phone || !address) {
        return res.status(400).json({ message: 'Phone and address must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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
    const { phone, rating } = req.body;

    if (!phone || typeof rating !== 'number') {
        return res.status(400).json({ message: 'Phone and a numeric rating must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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
    const { phone, reviewsCount } = req.body;

    if (!phone || typeof reviewsCount !== 'number') {
        return res.status(400).json({ message: 'Phone and a numeric reviewsCount must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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
    const { phone, serviceTypes } = req.body;

    if (!phone || !Array.isArray(serviceTypes)) {
        return res.status(400).json({ message: 'Phone and serviceTypes array must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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

// Update locationPincode
router.put('/update/locationPincode', async (req, res) => {
    const { phone, locationPincode } = req.body;

    if (!phone || !Array.isArray(locationPincode)) {
        return res.status(400).json({ message: 'Phone and locationPincode array must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
            { locationPincode },
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
    const { phone, reviewerName, rating, comment } = req.body; // Single new review

    // Validate required fields
    if (!phone || !reviewerName || typeof rating !== 'number' || !comment) {
        return res.status(400).json({ message: 'Phone, reviewerName, rating, and comment are required.' });
    }

    try {
        // Find the user and add the new review
        const updatedUser = await User.findOneAndUpdate(
            { phone },
            { 
                $push: { reviews: { reviewerName, rating, comment } },  // Add new review
                $inc: { reviewsCount: 1 }  // Increment reviewsCount by 1
            },
            { new: true } // Return the updated document
        );

        // Check if user was found
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate the new average rating
        const totalRatings = updatedUser.reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRatings / updatedUser.reviews.length;

        // Update the rating field with the new average
        updatedUser.rating = averageRating;
        await updatedUser.save(); // Save the updated rating

        // Return the updated user with new average rating
        res.status(200).json(updatedUser);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// GET user by phone number
router.post('/getByPhone', async (req, res) => {
    const { phone } = req.body; // Use query parameter

    // Ensure phone number is provided
    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required.' });
    }

    try {
        // Find the user based on phone number
        const user = await User.findOne({ phone });

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
router.put('/update/businessStatus', async (req, res) => {
    const { phone, businessAccountStatus } = req.body;

    // Validate that phone and businessAccountStatus are provided
    if (!phone || typeof businessAccountStatus !== 'boolean') {
        return res.status(400).json({ message: 'Phone and businessAccountStatus (true or false) must be provided.' });
    }

    try {
        // Find the user and update the businessAccountStatus
        const updatedUser = await User.findOneAndUpdate(
            { phone },
            { businessAccountStatus },
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
    const { phone, businessName } = req.body;

    if (!phone || !businessName) {
        return res.status(400).json({ message: 'Phone and businessName must be provided.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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
    const { phone, businessEmails } = req.body;

    // Ensure businessEmails is an array
    if (!phone || !Array.isArray(businessEmails)) {
        return res.status(400).json({ message: 'Phone and businessEmails must be provided as an array.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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
    const { phone, businessPhoneNumbers } = req.body;

    // Ensure businessPhoneNumbers is an array
    if (!phone || !Array.isArray(businessPhoneNumbers)) {
        return res.status(400).json({ message: 'Phone and businessPhoneNumbers must be provided as an array.' });
    }

    try {
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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
    const { phone, about } = req.body;

    // Validate input
    if (!phone || !about) {
        return res.status(400).json({ message: 'Phone and about must be provided.' });
    }

    try {
        // Update the user's about field
        const updatedUser = await User.findOneAndUpdate(
            { phone },
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

// GET all users
router.get('/getAll', async (req, res) => {
    try {
        // Retrieve all users from the database
        const users = await User.find();

        // If no users found, return a 404 error
        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found.' });
        }

        // Return the list of users
        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
