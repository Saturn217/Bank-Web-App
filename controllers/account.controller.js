
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');


const deposit = async (req, res) => {

    try {


        const { accountNumber, amount } = req.body;
        const NumericalAmount = parseFloat(req.body.amount);
        if (!NumericalAmount || NumericalAmount <= 0) {
            return res.status(400).send({
                message: "Invalid deposit amount"
            })
        }
        const depositUser = await BankUserModel.findOne({ accountNumber });

        if (!depositUser) {
            return res.status(404).send({
                message: "No user found"
            })
        }

        depositUser.balance += amount;
        await depositUser.save();


        await transactionModel.create({
            user: depositUser._id,
            accountNumber: depositUser.accountNumber,
            type: "deposit",
            amount: NumericalAmount,
            balanceAfter: depositUser.balance,
            senderAccount: depositUser.accountNumber,
            receiverAccount: depositUser.accountNumber,
            description: `Deposit of ${NumericalAmount} to account ${depositUser.accountNumber}`

        })

        return res.status(200).send({
            message: "Deposit successful",
            data: depositUser
        })


    }

    catch (err) {
        console.log("Error making deposit", err);
        return res.status(500).send({
            message: "Deposit failed",
            error: err.message
        })
    }
}


module.exports = { deposit }
