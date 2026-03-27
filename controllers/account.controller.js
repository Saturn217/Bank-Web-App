// 
const express = require('express');
const mongoose = require('mongoose');
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
const mailSender = require('../middleware/mailer');
const createNotification = require('../utils/createNotification');




let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODE_MAIL,
        pass: process.env.NODE_PASSWORD
    }
});




const deposit = async (req, res) => {
    try {
        const { amount, note = "" } = req.body;
        const NumericalAmount = parseFloat(amount);

        if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
            return res.status(400).json({ message: "Invalid deposit amount" });
        }

        if (NumericalAmount < 100) {
            return res.status(400).json({ message: "Minimum deposit amount is ₦100" });
        }

        const SINGLE_TRANSACTION_LIMIT = parseFloat(process.env.SINGLE_TRANSACTION_LIMIT);
        if (NumericalAmount > SINGLE_TRANSACTION_LIMIT) {
            return res.status(400).json({ message: `Single transaction limit is ₦${SINGLE_TRANSACTION_LIMIT.toLocaleString()}` });
        }

        const depositUser = await BankUserModel.findById(req.user._id);
        if (!depositUser) {
            return res.status(404).json({ message: "Your account not found" });
        }

        const DAILY_LIMIT = parseInt(process.env.DAILY_DEPOSIT_LIMIT) || 1000000;

        console.log('DAILY_LIMIT:', DAILY_LIMIT);
        console.log('depositUser._id:', depositUser._id);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        console.log('todayStart:', todayStart);

        const todayDeposits = await TransactionModel.aggregate([
            {
                $match: {
                    user: depositUser._id,
                    type: "deposit",
                    createdAt: { $gte: todayStart },
                    status: "success"
                }
            },
            { $group: { _id: null, totalDeposit: { $sum: "$amount" } } }
        ]);

        const depositedToday = todayDeposits[0]?.totalDeposit || 0;
        // console.log('depositedToday:', depositedToday);
        // console.log('NumericalAmount:', NumericalAmount);
        // console.log('Check:', depositedToday + NumericalAmount > DAILY_LIMIT);

        if (depositedToday + NumericalAmount > DAILY_LIMIT) {
            return res.status(403).json({
                message: `Daily deposit limit of ₦${DAILY_LIMIT.toLocaleString()} exceeded.`,
                depositedToday,
                remaining: DAILY_LIMIT - depositedToday
            });
        }

        depositUser.balance += NumericalAmount;
        await depositUser.save();

        const newTransaction = await TransactionModel.create({
            user: depositUser._id,
            accountNumber: depositUser.accountNumber,
            type: "deposit",
            amount: NumericalAmount,
            balanceAfter: depositUser.balance,
            senderAccount: "Bank Deposit",
            receiverAccount: depositUser.accountNumber,
            description: `Deposit of ₦${NumericalAmount.toLocaleString()} to your account`,
            note,
            status: "success"
        });

        await createNotification({
            userId: depositUser._id,
            type: 'deposit',
            title: 'Deposit Successful',
            message: `You have successfully deposited ₦${NumericalAmount.toLocaleString()} to your account.`,
            amount: NumericalAmount,
            transactionId: newTransaction._id
        });


        const depositHtml = await mailSender("deposit.ejs", {
            fullName: depositUser.fullName,
            amount: NumericalAmount,
            balanceAfter: depositUser.balance,
            accountNumber: depositUser.accountNumber,
            date: new Date().toLocaleString("en-NG", {
                weekday: "long", year: "numeric", month: "long",
                day: "numeric", hour: "2-digit", minute: "2-digit"
            }),
            note: note?.trim() || null,
            transactionId: newTransaction._id
        });


        transporter.sendMail({
            from: `Bank of Saturn <${process.env.NODE_MAIL}>`,
            to: depositUser.email,
            subject: `Deposit Successful: ₦${NumericalAmount.toLocaleString()} credited to your account`,
            html: depositHtml
        }, (err, info) => {
            if (err) console.error("Deposit email error:", err);
            else console.log("Deposit email sent:", info.response);
        });





        return res.status(200).json({
            message: "Deposit successful",
            data: {
                newBalance: depositUser.balance,
                transaction: {
                    id: newTransaction._id,
                    type: newTransaction.type,
                    amount: newTransaction.amount,
                    balanceAfter: newTransaction.balanceAfter,
                    description: newTransaction.description,
                    createdAt: newTransaction.createdAt,
                    // Only show note if it has content
                    ...(newTransaction.note?.trim() && { note: newTransaction.note })
                },

            }
        });

    } catch (err) {
        console.error("Deposit error:", err);
        return res.status(500).json({
            message: "Deposit failed",
            error: err.message || "Internal server error"
        });
    }
};

const withdrawal = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { amount, note = "" } = req.body;
        const NumericalAmount = parseFloat(amount);

        if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
            return res.status(422).send({
                message: "Invalid withdrawal amount"
            });
        }

        if (NumericalAmount < 1000) {
            return res.status(422).send({
                message: "Minimum withdrawal amount is 1000"
            });
        }

        const SINGLE_TRANSACTION_LIMIT = parseFloat(process.env.SINGLE_TRANSACTION_LIMIT);

        if (NumericalAmount > SINGLE_TRANSACTION_LIMIT) {
            return res.status(422).send({
                message: `Single transaction limit is ₦${SINGLE_TRANSACTION_LIMIT.toLocaleString()}`
            });
        }


        const withdrawalUser = await BankUserModel.findById(req.user.id).session(session);
        if (!withdrawalUser) {
            return res.status(404).send({
                message: "No user found"
            })
        }


        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayWithdraw = await TransactionModel.aggregate([
            {
                $match: {
                    user: withdrawalUser._id,
                    type: "withdrawal",
                    senderAccount: withdrawalUser.accountNumber,
                    status: "success",
                    createdAt: { $gte: todayStart }
                }
            },
            {
                $group: {
                    _id: null,
                    totalWithdrawn: { $sum: "$amount" }  
                }
            }
        ]);

        const totalWithdrawToday = todayWithdraw[0]?.totalWithdrawn || 0;  
        const remainingLimit = DAILY_WITHDRAWAL_LIMIT - totalWithdrawToday;

        if (totalWithdrawToday + NumericalAmount > process.env.DAILY_WITHDRAWAL_LIMIT) {
            return res.status(403).json({
                message: `Daily withdrawal limit of ₦${process.env.DAILY_WITHDRAWAL_LIMIT.toLocaleString()} exceeded. ` +
                    `You have ₦${remainingLimit.toLocaleString()} remaining today.`
            });
        }

        if (withdrawalUser.balance < NumericalAmount) {
            return res.status(409).send({
                message: "Insufficient balance"
            })
        }


        withdrawalUser.balance -= NumericalAmount;
        await withdrawalUser.save({ session });


        const [newTransaction] = await TransactionModel.create([{
            user: withdrawalUser._id,
            accountNumber: withdrawalUser.accountNumber,
            type: "withdrawal",
            amount: NumericalAmount,
            balanceAfter: withdrawalUser.balance,
            senderAccount: withdrawalUser.accountNumber,
            receiverAccount: withdrawalUser.accountNumber,
            description: `Withdrawal of ${NumericalAmount.toLocaleString()} from account ${withdrawalUser.accountNumber}`,
            note,
            status: "success"
        }], { session });

        await session.commitTransaction();

        await createNotification({
            userId: withdrawalUser._id,
            type: 'withdrawal',
            title: 'Withdrawal Successful',
            message: `You have successfully withdrawn ₦${NumericalAmount.toLocaleString()} from your account.`,
            amount: NumericalAmount,
            transactionId: newTransaction._id
        });

        const withdrawHtml = await mailSender("withdrawal.ejs", {
            fullName: withdrawalUser.fullName,
            amount: NumericalAmount,
            balanceAfter: withdrawalUser.balance,
            accountNumber: withdrawalUser.accountNumber,
            date: new Date().toLocaleString("en-NG", {
                weekday: "long", year: "numeric", month: "long",
                day: "numeric", hour: "2-digit", minute: "2-digit"
            }),
            note: note?.trim() || null,
            transactionId: newTransaction._id
        });


        transporter.sendMail({
            from: `Bank of Saturn <${process.env.NODE_MAIL}>`,
            to: withdrawalUser.email,
            subject: `Withdrawal Successful: ₦${NumericalAmount.toLocaleString()} withdrawn from your account`,
            html: withdrawHtml
        }, (err, info) => {
            if (err) console.error("Withdrawal email error:", err);
            else console.log("Withdrawal email sent:", info.response);
        });



        return res.status(200).send({
            message: "Withdrawal successful",
            data: withdrawalUser,

            Transaction: {
                _id: newTransaction._id,
                type: "withdrawal",
                amount: -NumericalAmount,
                senderAccount: withdrawalUser.accountNumber,
                receiverAccount: withdrawalUser.accountNumber,
                description: newTransaction.description,
                createdAt: newTransaction.createdAt,
                ...(newTransaction.note?.trim() && { note: newTransaction.note })
            }
        })

    }

    catch (error) {
        await session.abortTransaction();
        console.log("Error making withdrawal", error);
        return res.status(500).send({
            message: "Withdrawal failed",
            error: error.message
        })

    }
    finally {
        session.endSession();
    }
}


const Transfer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { receiverAccount, amount, note = "", transactionPin } = req.body;
        const NumericalAmount = parseFloat(amount);

        if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
            throw new Error("Invalid transfer amount");
        }

        if (NumericalAmount < 1000) {
            throw new Error("Minimum transfer amount is ₦1,000");
        }

        const SINGLE_TRANSACTION_LIMIT = parseFloat(process.env.SINGLE_TRANSACTION_LIMIT);
        if (NumericalAmount > SINGLE_TRANSACTION_LIMIT) {
            throw new Error(`Single transaction limit is ₦${SINGLE_TRANSACTION_LIMIT.toLocaleString()}`);
        }

        if (!receiverAccount) {
            throw new Error("Receiver account number is required");
        }

        const senderUser = await BankUserModel.findById(req.user._id).session(session);
        if (!senderUser) {
            throw new Error("Your account not found");
        }

        const DAILY_TRANSFER_LIMIT = parseFloat(process.env.DAILY_TRANSFER_LIMIT);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const todayTransfers = await TransactionModel.aggregate([
            {
                $match: {
                    user: senderUser._id,
                    type: "transfer",
                    senderAccount: senderUser.accountNumber, // only outgoing
                    status: "success",
                    createdAt: { $gte: startOfDay }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSent: { $sum: "$amount" }
                }
            }
        ]);

        const totalSentToday = todayTransfers[0]?.totalSent || 0;
        const remainingLimit = DAILY_TRANSFER_LIMIT - totalSentToday;

        if (totalSentToday + NumericalAmount > DAILY_TRANSFER_LIMIT) {
            throw new Error(
                `Daily transfer limit of ₦${DAILY_TRANSFER_LIMIT.toLocaleString()} exceeded. ` +
                `You have ₦${remainingLimit.toLocaleString()} remaining today.`
            );
        }

        const receiverUser = await BankUserModel.findOne({ accountNumber: receiverAccount }).session(session);
        if (!receiverUser) {
            throw new Error("Receiver account not found");
        }

        if (senderUser.accountNumber === receiverAccount) {
            throw new Error("Cannot transfer to your own account");
        }

        if (senderUser.balance < NumericalAmount) {
            throw new Error("Insufficient balance in your account");
        }

        senderUser.balance -= NumericalAmount;
        receiverUser.balance += NumericalAmount;

        await senderUser.save({ session });
        await receiverUser.save({ session });


        const [outgoingTx] = await TransactionModel.create([{
            user: senderUser._id,
            accountNumber: senderUser.accountNumber,
            type: "transfer",
            amount: NumericalAmount,
            balanceAfter: senderUser.balance,
            senderAccount: senderUser.accountNumber,
            receiverAccount: receiverUser.accountNumber,
            description: `Transfer of ₦${NumericalAmount.toLocaleString()} to ${receiverUser.fullName} (${receiverUser.accountNumber})`,
            note,
            status: "success"
        }], { session });

        await TransactionModel.create([{
            user: receiverUser._id,
            accountNumber: receiverUser.accountNumber,
            type: "transfer",
            amount: NumericalAmount,
            balanceAfter: receiverUser.balance,
            senderAccount: senderUser.accountNumber,
            receiverAccount: receiverUser.accountNumber,
            description: `Received ₦${NumericalAmount.toLocaleString()} from ${senderUser.fullName} (${senderUser.accountNumber})`,
            note,
            status: "success"
        }], { session });

        await session.commitTransaction();

        await createNotification({
            userId: senderUser._id,
            type: 'transfer_sent',
            title: 'Transfer Sent',
            message: `You sent ₦${NumericalAmount.toLocaleString()} to ${receiverUser.fullName} (${receiverAccount})`,
            amount: -NumericalAmount,
            transactionId: outgoingTx._id
        });

        await createNotification({
            userId: receiverUser._id,
            type: 'transfer_received',
            title: 'Transfer Received',
            message: `You received ₦${NumericalAmount.toLocaleString()} from ${senderUser.fullName} (${senderUser.accountNumber})`,
            amount: NumericalAmount,
            transactionId: outgoingTx._id
        });


        const debitHtml = await mailSender("transferDebit.ejs", {
            fullName: senderUser.fullName,
            amount: NumericalAmount,
            receiverName: receiverUser.fullName,
            receiverAccount: receiverUser.accountNumber,
            balanceAfter: senderUser.balance,
            date: new Date().toLocaleString("en-NG", {
                weekday: "long", year: "numeric", month: "long",
                day: "numeric", hour: "2-digit", minute: "2-digit"
            }),
            note: note?.trim() || null,
            transactionId: outgoingTx._id
        });


        const creditHtml = await mailSender("transferCredit.ejs", {
            fullName: receiverUser.fullName,
            amount: NumericalAmount,
            senderName: senderUser.fullName,
            senderAccount: senderUser.accountNumber,
            balanceAfter: receiverUser.balance,
            date: new Date().toLocaleString("en-NG", {
                weekday: "long", year: "numeric", month: "long",
                day: "numeric", hour: "2-digit", minute: "2-digit"
            }),
            note: note?.trim() || null,
            transactionId: outgoingTx._id
        });

        transporter.sendMail({
            from: `Bank of Saturn <${process.env.NODE_MAIL}>`,
            to: senderUser.email,
            subject: `Debit Alert: ₦${NumericalAmount.toLocaleString()} sent to ${receiverUser.fullName}`,
            html: debitHtml
        }, (err, info) => {
            if (err) console.error("Debit email error:", err);
            else console.log("Debit email sent:", info.response);
        });


        transporter.sendMail({
            from: `Bank of Saturn <${process.env.NODE_MAIL}>`,
            to: receiverUser.email,
            subject: `Credit Alert: ₦${NumericalAmount.toLocaleString()} received from ${senderUser.fullName}`,
            html: creditHtml
        }, (err, info) => {
            if (err) console.error("Credit email error:", err);
            else console.log("Credit email sent:", info.response);
        });


        return res.status(200).json({
            message: "Transfer successful",
            data: {
                sender: {
                    accountNumber: senderUser.accountNumber,
                    newBalance: senderUser.balance,
                    fullName: senderUser.fullName,
                    amount: NumericalAmount
                },
                receiver: {
                    accountNumber: receiverUser.accountNumber,
                    newBalance: receiverUser.balance,
                    fullName: receiverUser.fullName,
                    amount: NumericalAmount
                },
                amount: NumericalAmount,
                outgoingDescription: outgoingTx.description,
                status: "success",

                ...(note?.trim() && { note })
            }
        });

        let mailOptions = {
            from: `Bank of Saturn <${process.env.NODE_MAIL}>`,
            to: [senderUser.email, receiverUser.email],   // [email, another2gmail.com, another3gmail.com] if you want to send the email to multiple recipients
            subject: `Transfer Notification: ₦${NumericalAmount.toLocaleString()}  ${senderUser.fullName} → ${receiverUser.fullName}`,
            html: transferMail
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });






    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("Transfer error:", error);

        return res.status(500).json({
            message: "Transfer failed",
            error: error.message || "Internal server error"
        });

    } finally {
        session.endSession();
    }
};




const verifyAccountNumber = async (req, res) => {
    try {
        const { accountNumber } = req.query;

        if (!accountNumber || accountNumber.length !== 10) { // assuming 10-digit account numbers
            return res.status(400).json({ message: "Invalid account number format" });
        }

        const user = await BankUserModel.findOne({ accountNumber }).select('fullName');

        if (!user) {
            return res.status(200).json({
                found: false,
                message: "Account number not found"
            });
        }

        res.status(200).json({
            found: true,
            fullName: user.fullName
        });

    } catch (err) {
        res.status(500).json({ message: "Error verifying account" });
    }
};


const setTransactionPin = async (req, res) => {
    try {
        const { pin, confirmPin } = req.body;

        if (!pin || !confirmPin) {
            return res.status(400).json({ message: "PIN and confirmation required" });
        }

        if (pin !== confirmPin) {
            return res.status(400).json({ message: "PINs do not match" });
        }

        if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
            return res.status(400).json({ message: "PIN must be 4–6 digits" });
        }

        const user = await BankUserModel.findById(req.user._id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const salt = await bcrypt.genSalt(10);
        user.transactionPin = await bcrypt.hash(pin, salt);
        user.failedPinAttempts = 0;
        user.pinLockedUntil = null;

        await user.save();

        return res.status(200).json({
            message: "Transaction PIN set successfully"
        });

    } catch (err) {
        console.log(err)
        res.status(500).json({ message: "Failed to set PIN" });
    }
};



// Route: GET /api/v1/user/verify-account?accountNumber=1234567890 (protected or public?)
module.exports = { deposit, withdrawal, Transfer, verifyAccountNumber, setTransactionPin }