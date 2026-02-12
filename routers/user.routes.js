const express = require('express');
const { createBankUser } = require('../controllers/bankUser.controller');
const router = express.Router();











router.post("/newuser", createBankUser)

module.exports = router;