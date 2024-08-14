const express = require('express');
const { initDatabase } = require('../controllers/initController'); // Correctly require the function
const router = express.Router();

router.get('/initialize', initDatabase);

module.exports = router;
