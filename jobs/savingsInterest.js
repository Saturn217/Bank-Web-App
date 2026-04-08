

// require('dotenv').config();

// const cron = require('node-cron');
const mongoose = require('mongoose');
const BankUser = require('../models/bankUser.model');
const Transaction = require('../models/transaction.model');

const createNotification = require('../utils/createNotification');

const INTEREST_PERCENTAGE = parseFloat(process.env.SAVINGS_INTEREST_RATE) || 0.005;
const TIMEZONE = process.env.SAVINGS_INTEREST_TIMEZONE || 'Africa/Lagos';
const CRON_SCHEDULE = process.env.SAVINGS_INTEREST_CRON || '0 0 1 * *';
const ENABLE_INTEREST = process.env.ENABLE_SAVINGS_INTEREST !== 'false';


const getStartOfMonth = () => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
};

const awardMonthlyInterest = async () => {
    console.log(`[Monthly Savings Interest] Job started at ${new Date().toISOString()}`);

    const startOfMonth = getStartOfMonth();

    let success = 0;
    let skipped = 0;
    let failed = 0;

    try {

        const cursor = BankUser.find({
            isTestUser: true,
            savingsBalance: { $gt: 0 },
            $or: [
                { lastMonthlyInterestAt: { $exists: false } },
                { lastMonthlyInterestAt: null },
                { lastMonthlyInterestAt: { $lt: startOfMonth } }
            ]
        })
            .lean()
            .cursor();

        for (let user = await cursor.next(); user != null; user = await cursor.next()) {
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const originalBalance = user.savingsBalance;


                const interest = Math.round(originalBalance * INTEREST_PERCENTAGE);

                if (interest <= 0) {
                    skipped++;
                    await session.abortTransaction();
                    session.endSession();
                    continue;
                }


                await BankUser.updateOne(
                    { _id: user._id },
                    {
                        $inc: {
                            savingsBalance: interest,
                            totalInterestEarned: interest   // ← ADD THIS LINE
                        },
                        $set: { lastMonthlyInterestAt: new Date() }
                    },
                    { session }
                );

                const [newTx] = await Transaction.create([{
                    user: user._id,
                    accountNumber: user.accountNumber,
                    type: "savings_interest",
                    amount: interest,
                    description: `Monthly savings interest ₦${interest.toLocaleString()} (${(INTEREST_PERCENTAGE * 100).toFixed(2)}% of ₦${originalBalance.toLocaleString()})`,
                    status: "completed",
                    savingsBalanceAfter: originalBalance + interest,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }], { session });

                await session.commitTransaction();

                await createNotification({
                    userId: user._id,
                    type: 'savings_interest',
                    title: 'Savings Interest Awarded',
                    message: `You have earned ₦${interest.toLocaleString()} in monthly savings interest.`,
                    amount: interest,
                    transactionId: newTx._id
                });


                success++;
                console.log(`✔ ₦${interest} added to ${user.accountNumber} (new savings: ₦${(originalBalance + interest).toLocaleString()})`);

            } catch (innerErr) {
                await session.abortTransaction();
                failed++;
                console.error(`✖ Failed for user ${user._id} (${user.accountNumber}):`, innerErr.message);
            } finally {
                session.endSession();
            }
        }

        console.log(`[Monthly Interest] Job completed`);
        console.log(`  Successful: ${success}`);
        console.log(`  Skipped: ${skipped}`);
        console.log(`  Failed: ${failed}`);

    } catch (err) {
        console.error('[Monthly Interest] Critical job error:', err);
    }
};


const triggerInterest = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];

        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        await awardMonthlyInterest();

        return res.status(200).json({ status: 'success', message: 'Interest job completed' });

    } catch (err) {
        console.error('Trigger interest error:', err);
        return res.status(500).json({ status: 'error', message: 'Failed to trigger interest' });
    }
};



module.exports = { awardMonthlyInterest, triggerInterest };