const e = require('express');
const BankUserModel = require('../models/bankUser.model');

function generateAccountNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}


const createBankUser = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        const accountNumber = generateAccountNumber();


        const newBankUser = await BankUserModel.create({...req.body, accountNumber});
        res.status(201).send({
            message: "Bank user created successfully",
            data: newBankUser
        })

    }

    catch (err) {
        console.log("Error creating bank user", err);
        res.status(500).send({
            message: "Error creating bank user",
            error: err.message
        })
    }
}


module.exports = {createBankUser }

