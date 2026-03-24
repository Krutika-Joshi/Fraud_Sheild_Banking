const Transaction = require("../models/Transaction");
const Account = require("../models/Account");

const getFraudAlerts = async (req, res) => {
  try {

    const flaggedTransactions = await Transaction.find({
      status: "flagged"
    }).populate({
                  path: "accountId",
                  populate: {
                    path: "userId",
                    select: "name email"
                  }
                });

    res.json(flaggedTransactions);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};


const verifyAccount = async (req, res) => {
  try {

    const { accountNumber } = req.body;

    const account = await Account.findOne({ accountNumber });

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    const flaggedCount = await Transaction.countDocuments({
      accountId: account._id,
      status: "flagged"
    });

    let riskLevel = "LOW";

    if (flaggedCount > 0) {
      riskLevel = "HIGH";
    }

    res.json({
      accountNumber,
      riskLevel,
      flaggedTransactions: flaggedCount
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const blacklistAccount = async (req, res) => {
  try {

    const { accountId } = req.params;

    const account = await Account.findById(accountId);

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    // update account status
    account.status = "blacklisted";

    await account.save();

    res.json({
      message: "Account has been blacklisted successfully",
      accountNumber: account.accountNumber
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const freezeAccount = async (req, res) => {
  try {

    const { accountId } = req.params;

    const account = await Account.findById(accountId);

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    account.status = "frozen";

    await account.save();

    res.json({
      message: "Account frozen successfully",
      accountNumber: account.accountNumber
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const reviewTransaction = async (req, res) => {
  try {

    const { transactionId } = req.params;
    const { action } = req.body; // approve or reject

    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found"
      });
    }

    if (transaction.status !== "flagged") {
      return res.status(400).json({
        message: "Only flagged transactions can be reviewed"
      });
    }

    const account = await Account.findById(transaction.accountId);

    if (action === "approve") {

      transaction.status = "approved";

      // unfreeze account after approval
      if (account.status === "frozen") {
        account.status = "active";
        await account.save();
      }

    } else if (action === "reject") {

      transaction.status = "rejected";

      // refund money if withdrawal rejected
      if (transaction.type === "withdraw") {
        account.balance += transaction.amount;
        await account.save();
      }

    } else {
      return res.status(400).json({
        message: "Invalid action. Use approve or reject"
      });
    }

    await transaction.save();

    res.json({
      message: `Transaction ${action}d successfully`,
      transaction
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const monthlyFraudReport = async (req, res) => {
  try {

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const totalTransactions = await Transaction.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    const fraudTransactions = await Transaction.countDocuments({
      status: "flagged",
      createdAt: { $gte: startOfMonth }
    });

    const fraudRate = totalTransactions > 0
      ? ((fraudTransactions / totalTransactions) * 100).toFixed(2)
      : 0;

    res.json({
      month: startOfMonth.toLocaleString("default", { month: "long" }),
      totalTransactions,
      fraudTransactions,
      fraudRate: fraudRate + "%"
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const highRiskUsers = async (req, res) => {
  try {

    const riskyUsers = await Transaction.aggregate([
      { $match: { status: "flagged" } },
      {
        $lookup: {
          from: "accounts",
          localField: "accountId",
          foreignField: "_id",
          as: "account"
        }
      },
      { $unwind: "$account" },
      {
        $lookup: {
          from: "users",
          localField: "account.userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$user._id",
          name: { $first: "$user.name" },
          email: { $first: "$user.email" },
          flaggedTransactions: { $sum: 1 }
        }
      },
      { $sort: { flaggedTransactions: -1 } }
    ]);

    res.json(riskyUsers);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const fraudScoreReport = async (req, res) => {
  try {

    const users = await Transaction.aggregate([
      { $match: { status: "flagged" } },
      {
        $lookup: {
          from: "accounts",
          localField: "accountId",
          foreignField: "_id",
          as: "account"
        }
      },
      { $unwind: "$account" },
      {
        $lookup: {
          from: "users",
          localField: "account.userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$user._id",
          name: { $first: "$user.name" },
          email: { $first: "$user.email" },
          flaggedTransactions: { $sum: 1 }
        }
      }
    ]);

    const result = users.map(user => {

      const riskScore = Math.min(user.flaggedTransactions * 20, 100);

      let riskLevel = "LOW";
      if (riskScore >= 70) riskLevel = "HIGH";
      else if (riskScore >= 40) riskLevel = "MEDIUM";

      return {
        name: user.name,
        email: user.email,
        flaggedTransactions: user.flaggedTransactions,
        riskScore,
        riskLevel
      };

    });

    res.json(result);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyQR = async (req, res) => {
  try {
    const { accountNumber } = req.body;

    const account = await Account.findOne({ accountNumber });

    if (!account) {
      return res.status(404).json({
        status: "NOT_FOUND",
        message: "Account not found"
      });
    }

    if (account.isBlacklisted) {
      return res.json({
        status: "FRAUD",
        message: "This account is blacklisted"
      });
    }

    if (account.status === "frozen") {
      return res.json({
        status: "SUSPICIOUS",
        message: "Account is frozen due to suspicious activity"
      });
    }

    res.json({
      status: "SAFE",
      message: "Account is safe for transaction",
      // accountHolder: account.user.name
    });

  } catch (error) {
    res.status(500).json({
      message: "Error verifying QR",
      error: error.message
    });
  }
};

module.exports = {getFraudAlerts,
                  verifyAccount, 
                  blacklistAccount,
                  reviewTransaction,
                  freezeAccount,
                  monthlyFraudReport,
                  highRiskUsers,
                  fraudScoreReport,
                  verifyQR};