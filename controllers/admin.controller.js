const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');


const getAdminOverview = async (req, res) => {
  try {
   
    const totalUsers = await BankUserModel.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await BankUserModel.countDocuments({
      createdAt: { $gte: today }
    });
    
    const newUsersThisWeek = await BankUserModel.countDocuments({
      createdAt: { $gte: new Date(today.setDate(today.getDate() - 7)) }
    });

  
    const balances = await BankUserModel.aggregate([
      {
        $group: {
          _id: null,
          totalMain: { $sum: "$balance" },
          totalSavings: { $sum: "$savingsBalance" },
          totalInterestPaid: { $sum: "$totalInterestEarned" }
        }
      }
    ]);

    const totalMain = balances[0]?.totalMain || 0;
    const totalSavings = balances[0]?.totalSavings || 0;
    const totalInterestPaid = balances[0]?.totalInterestPaid || 0;
    const totalInSystem = totalMain + totalSavings;

  
    const highValueTransfers = await TransactionModel.find({
      type: 'transfer',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      amount: { $gt: 50000 }
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('createdAt amount senderFullName senderAccount receiverFullName receiverAccount description')
      .lean();

    const suspiciousAccounts = await BankUserModel.find({
      failedPinAttempts: { $gte: 3 },
      $or: [
        { pinLockedUntil: { $gt: new Date() } },
        { updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    })
      .select('fullName email accountNumber failedPinAttempts pinLockedUntil')
      .limit(10);

   
    const failedTransactions = await TransactionModel.countDocuments({
      status: 'failed',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: totalUsers,
          newToday: newUsersToday,
          newThisWeek: newUsersThisWeek
        },
        balances: {
          totalMain,
          totalSavings,
          totalInSystem,
          totalInterestPaid
        },
        recentHighValueTransfers: highValueTransfers.map(tx => ({
          ...tx,
          date: tx.createdAt.toLocaleString(),
          amountFormatted: '₦' + tx.amount.toLocaleString()
        })),
        suspiciousAccounts,
        failedTransactionsLast24h: failedTransactions,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('Admin overview error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to load admin overview'
    });
  }
};


module.exports = { getAdminOverview };