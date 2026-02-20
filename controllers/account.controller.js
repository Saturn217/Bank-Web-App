// 
const express = require('express');
const mongoose = require('mongoose');
const BankUserModel = require('../models/bankUser.model');
const transactionModel = require('../models/transaction.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')


// const deposit = async (req, res) => {

//     try {


//         const { accountNumber, amount } = req.body;
//         const NumericalAmount = parseFloat(req.body.amount);
//         if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
//             return res.status(400).send({
//                 message: "Invalid deposit amount"
//             })
//         }
//         if (NumericalAmount < 100) {
//             return res.status(400).send({
//                 message: "Minimum deposit amount is 100"
//             })
//         }
//         const depositUser = await BankUserModel.findOne({ accountNumber });

//         if (!depositUser) {
//             return res.status(404).send({
//                 message: "No user found"
//             })
//         }

//         depositUser.balance += NumericalAmount;

//         await depositUser.save();


//         const newTransaction = await transactionModel.create({
//             user: depositUser._id,
//             accountNumber: depositUser.accountNumber,
//             type: "deposit",
//             amount: NumericalAmount,
//             balanceAfter: depositUser.balance,
//             senderAccount: depositUser.accountNumber,   // or "CASH" / "EXTERNAL"
//             receiverAccount: depositUser.accountNumber,
//             description: `Deposit of ${NumericalAmount.toLocaleString()} to account ${depositUser.accountNumber}`,
//             note: req.body.note || "",
//             status: "success"
//         });


//         return res.status(200).json({
//             message: "Deposit successful",
//             data: {
//                 newBalance: depositUser.balance,
//                 transaction: {
//                     id: newTransaction._id,
//                     type: newTransaction.type,
//                     amount: newTransaction.amount,
//                     balanceAfter: newTransaction.balanceAfter,
//                     description: newTransaction.description,
//                     note: newTransaction.note,
//                     createdAt: newTransaction.createdAt
//                 },
//                 //  ...(note?.trim() && { note })
//             }
//         });



//     }

//     catch (err) {
//         console.log("Error making deposit", err);
//         return res.status(500).send({
//             message: "Deposit failed",
//             error: err.message
//         })
//     }
// }

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

        const depositUser = await BankUserModel.findById(req.user._id);
        if (!depositUser) {
            return res.status(404).json({ message: "Your account not found" });
        }

        depositUser.balance += NumericalAmount;
        await depositUser.save();

        const newTransaction = await transactionModel.create({
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


        const withdrawalUser = await BankUserModel.findById(req.user.id ).session(session);
        if (!withdrawalUser) {
            return res.status(404).send({
                message: "No user found"
            })
        }

        if (withdrawalUser.balance < NumericalAmount) {
            return res.status(409).send({
                message: "Insufficient balance"
            })
        }

        withdrawalUser.balance -= NumericalAmount;
        await withdrawalUser.save({ session });


        // await transactionModel.create({
        //     user: withdrawalUser._id,
        //     accountNumber: withdrawalUser.accountNumber,
        //     type: "withdrawal",
        //     amount: NumericalAmount,
        //     balanceAfter: withdrawalUser.balance,
        //     senderAccount: withdrawalUser.accountNumber,
        //     receiverAccount: withdrawalUser.accountNumber,
        //     description: `Withdrawal of ${NumericalAmount} from account ${withdrawalUser.accountNumber}`,
        //     note: req.body.note || ""

        // })

        const [newTransaction] = await transactionModel.create([{
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

        return res.status(200).send({
            message: "Withdrawal successful",
            data: withdrawalUser,

            Transaction: {
                _id: newTransaction._id,
                type: "withdrawal",
                amount: NumericalAmount,
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


// const Transfer = async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {

//         const { receiverAccount, amount} = req.body;
//         const NumericalAmount = parseFloat(amount);

//         console.log("Receiver account received:", receiverAccount);
//         console.log("Amount:", NumericalAmount);


//         if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
//             return res.status(422).json({ message: "Invalid transfer amount" });
//         }

//         if (NumericalAmount < 1000) {
//             return res.status(422).json({ message: "Minimum transfer amount is 1,000" });
//         }

//         if (!receiverAccount) {
//             return res.status(422).json({ message: "Receiver account number is required" });
//         }


//         const senderUser = await BankUserModel.findById(req.user._id).session(session);
//         if (!senderUser) {
//             return res.status(404).json({ message: "Your account not found" });
//         }


//         const receiverUser = await BankUserModel.findOne({ accountNumber: receiverAccount }).session(session);
//         if (!receiverUser) {
//             return res.status(404).json({ message: "Receiver account not found" });
//         }


//         if (senderUser.accountNumber === receiverAccount) {
//             return res.status(422).json({ message: "Cannot transfer to your own account" });
//         }

//         if (senderUser.balance < NumericalAmount) {
//             return res.status(409).json({ message: "Insufficient balance in your account" });
//         }


//         senderUser.balance -= NumericalAmount;
//         receiverUser.balance += NumericalAmount;

//         await senderUser.save({ session });
//         await receiverUser.save({ session });


//         const [outgoingTx] = await transactionModel.create([{
//             user: senderUser._id,
//             accountNumber: senderUser.accountNumber,
//             type: "transfer",
//             amount: NumericalAmount,
//             balanceAfter: senderUser.balance,
//             senderAccount: senderUser.accountNumber,
//             receiverAccount: receiverUser.accountNumber,
//             description: `Transfer of ₦${NumericalAmount.toLocaleString()} to ${receiverUser.fullName} (${receiverUser.accountNumber})`,
//             note: req.body.note || "",
//             status: "success"
//         }], { session });


//         await transactionModel.create([{
//             user: receiverUser._id,
//             accountNumber: receiverUser.accountNumber,
//             type: "transfer",
//             amount: NumericalAmount,
//             balanceAfter: receiverUser.balance,
//             senderAccount: senderUser.accountNumber,
//             receiverAccount: receiverUser.accountNumber,
//             description: `Received ₦${NumericalAmount.toLocaleString()} from ${senderUser.fullName} (${senderUser.accountNumber})`,
//             note: req.body.note || "",
//             status: "success"
//         }], { session });

//         await session.commitTransaction();

//         return res.status(200).json({
//             message: "Transfer successful",
//             data: {
//                 sender: {
//                     accountNumber: senderUser.accountNumber,
//                     newBalance: senderUser.balance,
//                     fullName: senderUser.fullName,

//                 },
//                 receiver: {
//                     accountNumber: receiverUser.accountNumber,
//                     newBalance: receiverUser.balance
//                 },
//                 amount: NumericalAmount,
//                 outgoingDescription: outgoingTx.description,
//                 status: "success",
//                   ...(note?.trim() && { note })

//             }
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         console.error("Transfer error:", error);

//         if (error.name === 'CastError') {
//             return res.status(400).json({ message: "Invalid account number format" });
//         }

//         return res.status(500).json({
//             message: "Transfer failed",
//             error: error.message || "Internal server error"
//         });
//     } finally {
//         session.endSession();
//     }
// };


const Transfer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { receiverAccount, amount, note = "" } = req.body;
        const NumericalAmount = parseFloat(amount);

        // console.log("Receiver account received:", receiverAccount);
        // console.log("Amount:", NumericalAmount);
        // console.log("Note received:", note);

        if (isNaN(NumericalAmount) || NumericalAmount <= 0) {
            throw new Error("Invalid transfer amount");
        }

        if (NumericalAmount < 1000) {
            throw new Error("Minimum transfer amount is 1000");
        }

        if (!receiverAccount) {
            throw new Error("Receiver account number is required");
        }

        const senderUser = await BankUserModel.findById(req.user._id).session(session);
        if (!senderUser) {
            throw new Error("Your account not found");
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

        const [outgoingTx] = await transactionModel.create([{
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

        await transactionModel.create([{
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

        return res.status(200).json({
            message: "Transfer successful",
            data: {
                sender: {
                    accountNumber: senderUser.accountNumber,
                    newBalance: senderUser.balance,
                    fullName: senderUser.fullName,
                },
                receiver: {
                    accountNumber: receiverUser.accountNumber,
                    newBalance: receiverUser.balance
                },
                amount: NumericalAmount,
                outgoingDescription: outgoingTx.description,
                status: "success",

                ...(note?.trim() && { note })
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
module.exports = { deposit, withdrawal, Transfer }