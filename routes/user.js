const express = require('express');
const bcrypt = require('bcrypt');
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
        businesslocation,
        Password // Accept plain password from the request body
    } = req.body;

    try {
        // Check if a user already exists with this email
        const existingUser = await User.findOne({ personalEmail });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        // Validate Password
        if (!Password || Password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        // Generate a unique ID
        const { nanoid } = await import('nanoid');
        const uniqueId = nanoid(20);

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(Password, saltRounds);

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
            Password: hashedPassword // Store the hashed password
        });

        // Save the user to the database
        const savedUser = await newUser.save();

        // Remove sensitive fields like password from the response
        const { Password, ...userWithoutPassword } = savedUser.toObject();
        res.status(201).json(userWithoutPassword);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server Error' });
    }
});

// POST for user login
router.post('/login', async (req, res) => {
    const { personalEmail, Password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ personalEmail });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Compare the provided password with the hashed password
        const isPasswordValid = await bcrypt.compare(Password, user.Password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

    
        // Return success response with user details (excluding sensitive fields)
        const { Password, ...userWithoutPassword } = user.toObject();
        res.status(200).json({ 
            message: 'Login successful',
            user: userWithoutPassword 
        });
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
    if (!personalEmail || !businesslocation || !businesslocation.Latitude || !businesslocation.Longitude) {
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

// // Update locationPincode
// router.put('/update/locationPincode', async (req, res) => {
//     const { personalEmail, locationPincode } = req.body;

//     if (!personalEmail || !Array.isArray(locationPincode)) {
//         return res.status(400).json({ message: 'personalEmail and locationPincode array must be provided.' });
//     }

//     try {
//         const updatedUser = await User.findOneAndUpdate(
//             { personalEmail },
//             { locationPincode },
//             { new: true }
//         );

//         if (!updatedUser) {
//             return res.status(404).json({ message: 'User not found' });
//         }

//         res.status(200).json(updatedUser);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server Error' });
//     }
// });


// PUT to add a new review, increment reviewsCount, and update average rating
router.put('/update/reviews', async (req, res) => {
    const { personalEmail, reviewerName, rating, comment } = req.body; // Single new review

    // Validate required fields
    if (!personalEmail || !reviewerName || typeof rating !== 'number' || !comment) {
        return res.status(400).json({ message: 'personalEmail, reviewerName, rating, and comment are required.' });
    }

    try {
        // Find the user and add the new review
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
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
router.put('/update/businessStatus', async (req, res) => {
    const { personalEmail, businessAccountStatus } = req.body;

    // Validate that phone and businessAccountStatus are provided
    if (!personalEmail || typeof businessAccountStatus !== 'boolean') {
        return res.status(400).json({ message: 'personalEmail and businessAccountStatus (true or false) must be provided.' });
    }

    try {
        // Find the user and update the businessAccountStatus
        const updatedUser = await User.findOneAndUpdate(
            { personalEmail },
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
