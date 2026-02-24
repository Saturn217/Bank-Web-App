

const mongoose = require('mongoose');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const payBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { billType, provider, reference, amount, note = "" } = req.body;

    // Required fields
    if (!billType || !provider || !reference || !amount) {
      return res.status(400).json({
        status: 'error',
        message: "Missing required fields: billType, provider, reference, amount"
      });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: "Invalid bill amount" });
    }

    // Validate billType (only 4 allowed)
    const validBillTypes = ['airtime', 'internet', 'electricity', 'water'];
    if (!validBillTypes.includes(billType.toLowerCase())) {
      return res.status(400).json({
        status: 'error',
        message: "Invalid bill type. Allowed: airtime, internet, electricity, water"
      });
    }

    // Reference validation based on bill type
    let referenceError = null;
    const ref = reference.toString().trim();

    if (billType === 'airtime' || billType === 'internet') {
      if (!/^\d{11}$/.test(ref)) {
        referenceError = `${billType.charAt(0).toUpperCase() + billType.slice(1)} reference must be exactly 11 digits (e.g. 08031234567)`;
      }
    } else if (billType === 'electricity') {
      if (!/^\d{7}$/.test(ref)) {
        referenceError = "Electricity meter number must be exactly 7 digits";
      }
    } else if (billType === 'water') {
      if (!/^\d{8,12}$/.test(ref)) {
        referenceError = "Water customer/meter number must be 8 to 12 digits";
      }
    }

    if (referenceError) {
      return res.status(400).json({ status: 'error', message: referenceError });
    }

    // Get user
    const user = await BankUser.findById(req.user._id).session(session);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.balance < paymentAmount) {
      return res.status(400).json({ message: "Insufficient balance in main account" });
    }

    // Deduct from main balance
    user.balance -= paymentAmount;
    await user.save({ session });

    // Create transaction
    const [newTx] = await Transaction.create([{
      user: user._id,
      accountNumber: user.accountNumber,
      type: "bill_payment",
      amount: -paymentAmount,
      balanceAfter: user.balance,
      savingsBalanceAfter: user.savingsBalance,
      senderAccount: user.accountNumber,
      receiverAccount: provider,
      description: `${billType.charAt(0).toUpperCase() + billType.slice(1)} payment to ${provider} - Ref: ${reference}`,
      billType: billType.toLowerCase(),
      billProvider: provider,
      billReference: reference,
      note,
      status: "success"
    }], { session });

    await session.commitTransaction();

    return res.status(200).json({
      message: `${billType.charAt(0).toUpperCase() + billType.slice(1)} payment successful`,
      data: {
        newBalance: user.balance,
        transaction: {
          id: newTx._id,
          type: newTx.type,
          amount: newTx.amount,
          description: newTx.description,
          createdAt: newTx.createdAt,
          ...(newTx.note?.trim() && { note: newTx.note })
        }
      }
    });

  } catch (err) {
    await session.abortTransaction();
    console.error("Bill payment error:", err);
    return res.status(500).json({
      message: "Bill payment failed",
      error: err.message || "Internal server error"
    });
  } finally {
    session.endSession();
  }
};

module.exports = { payBill };
