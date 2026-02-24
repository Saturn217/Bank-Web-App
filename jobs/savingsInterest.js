

require('dotenv').config();

const cron = require('node-cron');
const mongoose = require('mongoose');
const BankUser = require('../models/bankUser.model');
const Transaction = require('../models/transaction.model');

const INTEREST_PERCENTAGE = parseFloat(process.env.SAVINGS_INTEREST_RATE) || 0.005;
const TIMEZONE = process.env.SAVINGS_INTEREST_TIMEZONE || 'Africa/Lagos';
const CRON_SCHEDULE = process.env.SAVINGS_INTEREST_CRON || '0 0 1 * *';
const ENABLE_INTEREST = process.env.ENABLE_SAVINGS_INTEREST !== 'false';

// ────────────────────────────────────────────────
// Helper: Get start of current month (used to prevent double payment)
// ────────────────────────────────────────────────
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
            savingsBalance: { $gt: 0 },
            $or: [
                { lastMonthlyInterestAt: { $exists: false } },
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

                // Calculate interest (round to nearest whole ₦)
                const interest = Math.round(originalBalance * INTEREST_PERCENTAGE);

                if (interest <= 0) {
                    skipped++;
                    await session.abortTransaction();
                    session.endSession();
                    continue;
                }

                // Atomic update: add interest + set last interest date
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

                // Record transaction
                await Transaction.create([{
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

// ────────────────────────────────────────────────
// Only schedule if enabled in .env
// ────────────────────────────────────────────────
if (ENABLE_INTEREST) {
    cron.schedule(CRON_SCHEDULE, awardMonthlyInterest, {
        timezone: TIMEZONE
    });

    console.log(`Monthly savings interest job scheduled (rate: ${(INTEREST_PERCENTAGE * 100).toFixed(2)}%, cron: ${CRON_SCHEDULE}, tz: ${TIMEZONE})`);
} else {
    console.log('Monthly savings interest job is DISABLED via .env');
}

// ────────────────────────────────────────────────
// DEV ONLY: Run once immediately (controlled by .env or NODE_ENV)
// ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development' || process.env.RUN_INTEREST_NOW === 'true') {
    console.log('[DEV] Running interest job immediately...');
    awardMonthlyInterest();
}