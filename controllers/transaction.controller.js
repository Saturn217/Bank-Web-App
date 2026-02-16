
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');



const getTransactions  = async (req, res) => {

    try {
        const { accountNumber } = req.params;
        const transactions = await TransactionModel.find({ accountNumber }).sort({ createdAt: -1 });

        if (transactions.length === 0) {            
            return res.status(404).send({
                message: "No transactions found for this account"
            })
        }
        return res.status(200).send({
            message: "Transactions retrieved successfully",
            data: transactions
        })
    }

    catch (err) {
        console.log("Error retrieving transactions", err);
        return res.status(500).send({
            message: "Error retrieving transactions",
            error: err.message
        })
    }       
}
