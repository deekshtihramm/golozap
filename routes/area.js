const express = require('express');
const State = require('../model/Area'); // Ensure this path is correct

const router = express.Router();

// POST API to create a new state
router.post('/state/add', async (req, res) => {
  try {
    const { state, districts } = req.body; // Destructure state and districts from the request body

    // Create a new state document
    const newState = new State({
      state,
      districts,
    });

    // Save the new state document to the database
    await newState.save();

    // Respond with the created state data
    res.status(201).json(newState);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while creating the state' });
  }
});

// GET API to retrieve data by state name
router.post('/state/get', async (req, res) => {
  try {
    const { stateName } = req.body; // Read state name from request body

    // Find the state by name
    const stateData = await State.findOne({ state: stateName });

    if (!stateData) {
      return res.status(404).json({ message: 'State not found' });
    }

    // Respond with state data
    res.json(stateData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching state data' });
  }
});

app.post('/api/state/get2', async (req, res) => {
  try {
    const { searchName } = req.body;

    // Handle invalid or missing searchName
    if (typeof searchName !== 'string') {
      return res.status(400).json({ message: 'Invalid or missing search input' });
    }

    // If searchName is empty, fetch all data
    const regex = searchName.trim() ? new RegExp(searchName, 'i') : /.*/; // Match everything if searchName is empty

    // Query to match state, district, sub-district, or village
    const states = await State.find({
      $or: [
        { state: regex },
        { 'districts.district': regex },
        { 'districts.subDistricts.subDistrict': regex },
        { 'districts.subDistricts.villages': regex },
      ],
    });

    if (states.length === 0) {
      return res.status(404).json({ message: 'No matching data found' });
    }

    // Return the filtered results
    res.json(states);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ message: 'An error occurred while fetching data' });
  }
});


// GET API to retrieve only state names
router.get('/state/names', async (req, res) => {
  try {
    // Fetch only the "state" field for all documents
    const stateNames = await State.find({}, 'state');

    // Respond with an array of state names
    res.json(stateNames.map((state) => state.state));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching state names' });
  }
});


// GET API to retrieve all districts of a given state without sub-district or village data
router.post('/state/districts', async (req, res) => {
  try {
    const { stateName } = req.body; 

    // Find the state by name and retrieve only district names
    const stateData = await State.findOne(
      { state: stateName },
      { 'districts.district': 1 } // Project only the 'district' field within 'districts'
    );

    if (!stateData) {
      return res.status(404).json({ message: 'State not found' });
    }

    // Extract only the district names from the result
    const districtNames = stateData.districts.map(district => district.district);

    // Respond with an array of district names
    res.json(districtNames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching districts' });
  }
});


// GET API to retrieve all sub-districts of a given state and district
router.post('/state/subdistricts', async (req, res) => {
  try {
    const { stateName, districtName } = req.body; // Read state and district names from query parameters

    // Find the state by name and filter by district to retrieve only sub-district names
    const stateData = await State.findOne(
      { state: stateName, 'districts.district': districtName },
      { 'districts.$': 1 } // Use positional operator to project only the matched district
    );

    if (!stateData || stateData.districts.length === 0) {
      return res.status(404).json({ message: 'District not found in the specified state' });
    }

    // Extract only the sub-district names from the matched district
    const subDistrictNames = stateData.districts[0].subDistricts.map(subDistrict => subDistrict.subDistrict);

    // Respond with an array of sub-district names
    res.json(subDistrictNames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching sub-districts' });
  }
});


// GET API to retrieve all villages of a given state, district, and sub-district
router.post('/state/villages', async (req, res) => {
  try {
    const { stateName, districtName, subDistrictName } = req.body; // Read state, district, and sub-district names from query parameters

    // Find the state, district, and sub-district to retrieve only village names
    const stateData = await State.findOne(
      {
        state: stateName,
        'districts.district': districtName,
        'districts.subDistricts.subDistrict': subDistrictName,
      },
      { 'districts.$': 1 } // Use positional operator to project only the matched district
    );

    if (!stateData || stateData.districts.length === 0) {
      return res.status(404).json({ message: 'District not found in the specified state' });
    }

    // Find the matching sub-district within the matched district
    const district = stateData.districts[0];
    const subDistrict = district.subDistricts.find(
      (sd) => sd.subDistrict === subDistrictName
    );

    if (!subDistrict) {
      return res.status(404).json({ message: 'Sub-district not found in the specified district' });
    }

    // Extract village names
    const villageNames = subDistrict.villages;

    // Respond with an array of village names
    res.json(villageNames);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching villages' });
  }
});


// GET API to retrieve all data for a given state, including districts, sub-districts, and villages
router.get('/state/allData', async (req, res) => {
  try {
    const { stateName } = req.query; // Retrieve state name from query parameters

    // Find the state by name and retrieve all the data (districts, sub-districts, villages)
    const stateData = await State.findOne({ state: stateName });

    if (!stateData) {
      return res.status(404).json({ message: 'State not found' });
    }

    // Respond with the complete state data
    res.json(stateData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while fetching state data' });
  }
});


module.exports = router;
