const express = require('express');
const { createBankUser } = require('../controllers/bankUser.controller');
const router = express.Router();











router.post("/register", createBankUser)

module.exports = router;