const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

function generateAccountNumber() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}


const createBankUser = async (req, res) => {
    const session = await BankUserModel.startSession();
    session.startTransaction()
    try {
        const { fullName, email, password } = req.body;
        const accountNumber = generateAccountNumber();

        const saltround = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, saltround)

        const [newBankUser] = await BankUserModel.create([{ fullName, email, accountNumber, password: hashedPassword }], { session })


        await transactionModel.create([{
            user: newBankUser._id,
            type: "deposit",
            amount: 100000,
            balanceAfter: 100000,
            senderAccount: "BANK_WELCOME",
            receiverAccount: newBankUser.accountNumber,
            description: "Welcome bonus of ₦100,000 on account opening",
            status: "success",

        }], { session });


        await session.commitTransaction();

        res.status(201).send({
            message: "Bank user created successfully",
            data: {
                fullName,
                email,
                accountNumber,
                balance: newBankUser.balance,
                roles: newBankUser.roles


            }
        })

    }

    catch (error) {
        await session.abortTransaction();
        console.log(error);
        if (error.code === 11000) {
            return res.status(400).send({
                message: "User already registered"
            })
        }

        res.status(500).send({
            message: 'User creation failed',
            error: error.message
        })
    }

    finally {
        session.endSession();
    }
}


const login = async (req, res) => {
    const { email, password } = req.body

    try {
        const isUser = await BankUserModel.findOne({ email })

        if (!isUser) {
            return res.status(404).send({
                message: "Invalid User credential"
            })
        }

        const isMatch = await bcrypt.compare(password, isUser.password)
        if (!isMatch) {
            return res.status(404).send({
                message: "Invalid User credential"
            })
        }


        const token = await jwt.sign({ id: isUser._id, roles: isUser.roles }, process.env.JWT_SECRET, { expiresIn: "5h" })

        res.status(200).send({
            message: "Logged in successfully",
            data: {
                email: isUser.email,
                roles: isUser.roles,
                firstName: isUser.firstName,
                lastName: isUser.lastName
            },
            token
        })

    }

    catch (error) {
        console.log(error);
        res.send(400).send({
            message: "Failed to log in",
            error: error.message
        })

    }


}


const getMe = async (req, res) => {

    console.log(req.user);

    try {
        const user = await BankUserModel.findById(req.user.id).select("-password")

        res.status(200).send({
            message: "user retrieved successfully",
            data: user
        })
    }
    catch (error) {


        res.status(401).send({
            message: "User not found"
        })

    }

}




module.exports = { createBankUser, login, getMe }

