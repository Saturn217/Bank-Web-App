require('dotenv').config()
const express = require('express');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const otpgen = require("otp-generator")
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const createNotification = require('../utils/createNotification');
const connectDB = require("../database/connectDB")
// const dotenv = require('dotenv')
// dotenv.config()

console.log('EMAIL_USER from env:', process.env.NODE_MAIL);
console.log('EMAIL_PASS exists:', !!process.env.NODE_PASSWORD);
console.log('EMAIL_PASS length:', process.env.NODE_PASSWORD?.length || 0);
const nodemailer = require('nodemailer')
const mailSender = require('../middleware/mailer');
const OTPModel = require('../models/otp.model');


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






        const token = await jwt.sign({ id: newBankUser._id }, process.env.JWT_SECRET, { expiresIn: "5h" })


        await TransactionModel.create([{
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

        await createNotification({
            userId: newBankUser._id,
            type: 'welcome_bonus',
            title: 'Welcome Bonus',
            message: 'You have received a welcome bonus of ₦100,000!',
            amount: 100000
        });


        const renderMail = await mailSender("welcomeMail.ejs", {
            fullName: newBankUser.fullName || newBankUser.fullName.split(' ')[0] || 'User',
            accountNumber: newBankUser.accountNumber,
            dashboardUrl: 'https://yourapp.com/dashboard',                       // ← add this
            supportUrl: 'https://yourapp.com/support',                           // ← add if used
            privacyUrl: 'https://yourapp.com/privacy',                           // ← add if used

            termsUrl: 'https://yourapp.com/terms'
        })


        let mailOptions = {
             from: `Bank of Saturn <${process.env.NODE_MAIL}>`,
            to: [email, process.env.NODE_MAIL],
            subject: 'Welcome to Our Bank!',
            html: renderMail
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent: " + info.response);
        } catch (mailError) {
            console.error("Error sending welcome email:", mailError);
        }


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
        await connectDB()
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
            'fullName email accountNumber balance savingsBalance totalInterestEarned lastMonthlyInterestAt roles transactionPin createdAt'
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const hasTransactionPin = !!user.transactionPin;

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
                hasTransactionPin,
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

        const interestThisMonth = await TransactionModel.aggregate([
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
        const billsThisMonth = await TransactionModel.aggregate([
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
        // 4. Get 5 most recent transactions
        const recentTransactions = await TransactionModel.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('createdAt type amount description status note senderAccount receiverAccount billType billProvider billReference')
            .lean();

        // Enrich transfers with names via account number lookup
        const accountNumbers = new Set();
        recentTransactions.filter(tx => tx.type === "transfer").forEach(tx => {
            if (tx.senderAccount) accountNumbers.add(tx.senderAccount);
            if (tx.receiverAccount) accountNumbers.add(tx.receiverAccount);
        });

        let userMap = {};
        if (accountNumbers.size > 0) {
            const users = await BankUserModel
                .find({ accountNumber: { $in: [...accountNumbers] } })
                .select("fullName accountNumber").lean();
            users.forEach(u => { userMap[u.accountNumber] = u.fullName; });
        }

        const formattedTx = recentTransactions.map(tx => ({
            date: tx.createdAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            type: tx.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: tx.description,
            amount: tx.amount,
            isPositive: tx.amount > 0,
            formattedAmount: (tx.amount > 0 ? '+' : '') + '₦' + Math.abs(tx.amount).toLocaleString(),
            senderName: userMap[tx.senderAccount] || null,
            receiverName: userMap[tx.receiverAccount] || null,
            note: tx.note || null,
        }));


        return res.status(200).json({
            message: "Dashboard data retrieved",
            data: {
                fullName: user.fullName,
                totalBalance: user.balance,
                accountNumber: user.accountNumber,
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

const requestOTP = async (req, res) => {
    const { email } = req.body
    try {
        // save their otp and mail in the db
        // send them a mail with the otp


        const isUser = await BankUserModel.findOne({ email })
        if (!isUser) {
            res.status(401).send({
                message: "account with this email does not exist, please register",

            })
            return
        }

        const sendOTP = otpgen.generate(4, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false, digit: true })

        const user = OTPModel.create({
            email: email,
            otp: sendOTP,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        })



        const otpMail = await mailSender("otpMail.ejs", {
            otp: sendOTP,
            email: isUser.email,
            isUser,
            dashboardUrl: 'https://yourapp.com/dashboard',
            supportUrl: 'https://yourapp.com/support',
            privacyUrl: 'https://yourapp.com/privacy',
            resetUrl: 'https://yourapp.com/reset-password',
            termsUrl: 'https://yourapp.com/terms'
        });


        let mailOptions = {
            from: process.env.NODE_MAIL,
            to: email,   // [email, another2gmail.com, another3gmail.com] if you want to send the email to multiple recipients
            subject: "Bank of Saturn: OTP for password reset",
            html: otpMail
        };


        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent: " + info.response);
        } catch (mailError) {
            console.error("Error sending welcome email:", mailError);
        }

        res.status(200).send({
            message: "OTP sent to your email",

        })

    }
    catch (error) {
        console.log(error);
        res.status(400).send({
            message: "OTP request failed"
        })
    }

}

const forgotPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body

    try {
        const isUser = await OTPModel.findOne({ email })

        if (!isUser) {
            res.status(404).send({
                message: "Invalid OTP"
            })

            return
        }

        let isMatch = (otp === isUser.otp)
        if (!isMatch) {
            res.status(404).send({
                message: "Invalid OTP"
            })

            return
        }

        const saltround = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(newPassword, saltround)
        const user = await BankUserModel.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true })

        res.status(200).send({
            message: "password updated successfully"
        })

    }

    catch (error) {
        console.log(error);
        res.status(400).send({
            message: "Password reset failed"
        })
    }
}


const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;


        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New password and confirmation do not match" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters" });
        }


        const user = await BankUserModel.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }


        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        //  await BankUserModel.findOneAndUpdate({ email }, { password: hashedPassword }, { new: true })

        await user.save();

        return res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (err) {
        console.error("Change password error:", err);
        return res.status(500).json({ message: "Password change failed" });
    }
};

module.exports = { createBankUser, login, getMe, getDashboard, requestOTP, forgotPassword, changePassword }


