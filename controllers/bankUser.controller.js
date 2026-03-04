require('dotenv').config()
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
// const dotenv = require('dotenv')
// dotenv.config()

console.log('EMAIL_USER from env:', process.env.NODE_MAIL);
console.log('EMAIL_PASS exists:', !!process.env.NODE_PASSWORD);
console.log('EMAIL_PASS length:', process.env.NODE_PASSWORD ?.length || 0);
const nodemailer = require('nodemailer')
const mailSender = require('../middleware/mailer')


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODE_MAIL,
        pass: process.env.NODE_PASSWORD
    }
});

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
        const renderMail = await mailSender("welcomeMail.ejs", {
            fullName: newBankUser.fullName || newBankUser.fullName.split(' ')[0] || 'User',
            accountNumber: newBankUser.accountNumber,
            dashboardUrl: 'https://yourapp.com/dashboard',                       // ← add this
            supportUrl: 'https://yourapp.com/support',                           // ← add if used
            privacyUrl: 'https://yourapp.com/privacy',                           // ← add if used

            termsUrl: 'https://yourapp.com/terms'
        })

        const token = await jwt.sign({ id: newBankUser._id }, process.env.JWT_SECRET, { expiresIn: "5h" })


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


            },
            token
        })


        let mailOptions = {
            from: process.env.NODE_MAIL,
            to: [email, process.env.NODE_MAIL],
            subject: 'Welcome to Our Bank!',
            html: renderMail
        };


        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

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
    try {
        const user = await BankUserModel.findById(req.user._id).select(
            'fullName email accountNumber balance savingsBalance totalInterestEarned lastMonthlyInterestAt roles createdAt'
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Normalize today's date to midnight (LOCAL time)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let interestStatus = "not_eligible";
        let nextInterestPayment = null;

        // Only calculate projection if user has savings
        if (user.savingsBalance > 0) {
            interestStatus = "eligible";

            // First day of next month (always future payout date)
            const nextInterestDate = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                1
            );

            nextInterestDate.setHours(0, 0, 0, 0);

            const diffInMs = nextInterestDate - today;
            const daysUntil = Math.ceil(
                diffInMs / (1000 * 60 * 60 * 24)
            );

            nextInterestPayment = {
                estimatedDate: nextInterestDate.toLocaleDateString('en-CA'), // YYYY-MM-DD
                daysUntil
            };
        }

        return res.status(200).json({
            message: "User profile retrieved",
            data: {
                ...user.toObject(),
                interestStatus,
                nextInterestPayment
            }
        });

    } catch (err) {
        console.error("Get /me error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};


const getDashboard = async (req, res) => {
    try {
        // 1. Get user basics
        const user = await BankUserModel.findById(req.user._id).select(
            'fullName balance savingsBalance totalInterestEarned lastMonthlyInterestAt accountNumber'
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 2. Calculate interest earned this month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const interestThisMonth = await transactionModel.aggregate([
            {
                $match: {
                    user: req.user._id,
                    type: "savings_interest",
                    createdAt: { $gte: monthStart }
                }
            },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const interestThisMonthTotal = interestThisMonth[0]?.total || 0;

        // 3. Calculate bills paid this month (dynamic - no hard-coding)
        const billsThisMonth = await transactionModel.aggregate([
            {
                $match: {
                    user: req.user._id,
                    type: "bill_payment",
                    createdAt: { $gte: monthStart },
                    amount: { $lt: 0 }  // only outflows (payments)
                }
            },
            { $group: { _id: null, total: { $sum: { $abs: "$amount" } } } }  // sum absolute values
        ]);

        const billsThisMonthTotal = billsThisMonth[0]?.total || 0;  // defaults to 0 if no bills

        // 4. Get 5 most recent transactions
        const recentTransactions = await transactionModel.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('createdAt type description amount status')
            .lean();

        // Format for frontend (add color class & nice display)
        const formattedTx = recentTransactions.map(tx => ({
            date: tx.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            type: tx.type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: tx.description,
            amount: tx.amount,
            isPositive: tx.amount > 0,
            formattedAmount: (tx.amount > 0 ? '+' : '') + '₦' + Math.abs(tx.amount).toLocaleString()
        }));

        return res.status(200).json({
            message: "Dashboard data retrieved",
            data: {
                fullName: user.fullName,
                totalBalance: user.balance + user.savingsBalance,
                savingsBalance: user.savingsBalance,
                interestThisMonth: interestThisMonthTotal,
                billsThisMonth: billsThisMonthTotal,  // now dynamic & 0 if none
                recentTransactions: formattedTx
            }
        });

    } catch (err) {
        console.error("Dashboard error:", err);
        return res.status(500).json({ message: "Failed to load dashboard" });
    }
};


module.exports = { createBankUser, login, getMe, getDashboard }

