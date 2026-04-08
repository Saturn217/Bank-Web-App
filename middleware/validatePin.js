const BankUserModel = require("../models/bankUser.model.js");
const bcrypt = require("bcrypt");
const connectDB = require("../database/connectDB")

const MAX_ATTEMPTS = 3;
const LOCK_DURATION = 30 * 60 * 1000; 

const validatePin = async (req, res, next) => {
   await connectDB(); 
  try {
   

    const { transactionPin } = req.body;

    if (!transactionPin) {
      return res.status(400).json({ message: "Transaction PIN is required" });
    }

    const user = await BankUserModel.findById(req.user._id)
      .select('+transactionPin +failedPinAttempts +pinLockedUntil');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.transactionPin) {
      return res.status(400).json({ message: "Please set a transaction PIN first" });
    }

    //  Check if still locked
    if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
      const remaining = Math.ceil((user.pinLockedUntil - new Date()) / 60000);
      return res.status(403).json({
        message: `Account locked. Try again in ${remaining} minute(s).`
      });
    }

    // Reset attempts if lock has expired
    if (user.pinLockedUntil && user.pinLockedUntil <= new Date()) {
      user.failedPinAttempts = 0;
      user.pinLockedUntil = null;
    }

    const isValid = await bcrypt.compare(transactionPin, user.transactionPin);

    if (!isValid) {
      user.failedPinAttempts += 1;
      const attemptsLeft = MAX_ATTEMPTS - user.failedPinAttempts;

      //  Lock if max attempts reached
      if (user.failedPinAttempts >= MAX_ATTEMPTS) {
        user.pinLockedUntil = new Date(Date.now() + LOCK_DURATION);
        user.failedPinAttempts = 0; //  reset so fresh attempts after lock expires
        await user.save();
        return res.status(403).json({
          message: "Too many incorrect attempts. Account locked for 30 minutes."
        });
      }

      await user.save();
      return res.status(400).json({
        message: `Incorrect PIN. ${attemptsLeft} attempt(s) remaining.` //  tells user attempts left
      });
    }

    //  PIN correct — reset everything
    user.failedPinAttempts = 0;
    user.pinLockedUntil = null;
    await user.save();

    next();

  } catch (error) {
    console.error("PIN validation error:", error);
    return res.status(500).json({
      message: "PIN validation failed",
      error: error.message
    });
  }
};

module.exports = {validatePin};