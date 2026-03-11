const BankUserModel = require("../models/bankUser.model");
const bcrypt = require('bcrypt');






const validatePin = async (req, res, next) => {
  const { transactionPin } = req.body;

  if (!transactionPin) {
    return res.status(400).json({ message: "Transaction PIN required" });
  }

  // ✅ explicitly include the field
  const user = await BankUserModel.findById(req.user._id)
    .select('+transactionPin +failedPinAttempts +pinLockedUntil');


  if (!user.transactionPin) {
    return res.status(400).json({ message: "Please set a transaction PIN first" });
  }

  // Check lock
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const remaining = Math.ceil((user.pinLockedUntil - new Date()) / 60000);
    return res.status(403).json({
      message: `Too many incorrect attempts. Locked for ${remaining} more minutes.`
    });
  }

  const isValid = await bcrypt.compare(transactionPin, user.transactionPin);
  if (!isValid) {
    user.failedPinAttempts += 1;
    if (user.failedPinAttempts >= 3) {
      user.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    }
    await user.save();
    return res.status(400).json({ message: "Incorrect PIN" });
  }


  user.failedPinAttempts = 0;
  user.pinLockedUntil = null;
  await user.save();

  next();
};

module.exports = validatePin;