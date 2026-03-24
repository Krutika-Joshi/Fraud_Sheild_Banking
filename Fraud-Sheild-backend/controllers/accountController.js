const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const sendFraudAlertEmail = require("../utils/emailService");
const QRCode = require("qrcode");

const createAccount = async (req, res) => {
  try {

    const userId = req.user.id;

    // check if user already has an account
    const existingAccount = await Account.findOne({ userId });

    if (existingAccount) {
      return res.status(400).json({
        message: "Account already exists"
      });
    }

    // generate random account number
    const accountNumber = Math.floor(
      1000000000 + Math.random() * 9000000000
    );

    const account = new Account({
      userId,
      accountNumber
    });

    await account.save();

    res.json({
      message: "Bank account created successfully",
      account
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const getBalance = async (req, res) => {
  try {

    const userId = req.user.id;

    const account = await Account.findOne({ userId });

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

   res.json({
      accountId: account._id,
      accountNumber: account.accountNumber,
      balance: account.balance
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const depositMoney = async (req, res) => {
  try {

    const userId = req.user.id;
    const { amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({
        message: "Invalid deposit amount"
      });
    }

    const account = await Account.findOne({ userId });

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    if (account.status === "blacklisted") {
      return res.status(403).json({
        message: "Account is blacklisted. Contact bank support."
      });
    }

    if (account.status === "frozen") {
      return res.status(403).json({
        message: "Account is frozen due to suspicious activity"
      });
    }

    // update balance
    account.balance += amount;
    await account.save();

    // save transaction
    const transaction = new Transaction({
      accountId: account._id,
      type: "deposit",
      amount,
      status: "success"
    });

    await transaction.save();

    res.json({
      message: "Deposit successful",
      newBalance: account.balance
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const withdrawMoney = async (req, res) => {
  try {

    const userId = req.user.id;
    const { amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({
        message: "Invalid withdrawal amount"
      });
    }

    const account = await Account.findOne({ userId });

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    // check location mismatch
    const currentIP = req.ip;

    const user = await require("../models/User").findById(userId);

    if (user.lastLoginIP && user.lastLoginIP !== currentIP) {
      account.status = "frozen";
      await account.save();

      return res.status(403).json({
        message: "Location mismatch detected. Account frozen."
      });
    }

    // calculate today's withdrawals
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);

    const todayWithdrawals = await Transaction.aggregate([
      {
        $match: {
          accountId: account._id,
          type: "withdraw",
          createdAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" }
        }
      }
    ]);

    const totalWithdrawnToday = todayWithdrawals.length > 0 ? todayWithdrawals[0].total : 0;

    if (account.status === "blacklisted") {
      return res.status(403).json({
        message: "Account is blacklisted. Contact bank support."
      });
    }

    if (account.status === "frozen") {
      return res.status(403).json({
        message: "Account is frozen due to suspicious activity"
      });
    }

    

    if (account.balance < amount) {
      return res.status(400).json({
        message: "Insufficient balance"
      });
    }

    // deduct balance
    account.balance -= amount;
    
    // fraud rule
    let status = "success";

    // single large withdrawal
    if (amount > 50000) {
    status = "flagged";

    // freeze account if suspicious activity detected
    account.status = "frozen";
    }


    // daily withdrawal limit rule
    if (totalWithdrawnToday + amount > 50000) {
      status = "flagged";

      // freeze account for suspicious activity
      account.status = "frozen";
    }

    // rapid transaction detection (3 withdrawals in 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);

    const rapidTransactions = await Transaction.find({
      accountId: account._id,
      type: "withdraw",
      createdAt: { $gte: thirtySecondsAgo }
    });

    if (rapidTransactions.length >= 3) {
      status = "flagged";

      // freeze account for suspicious activity
      account.status = "frozen";
    }


    // save account changes
    await account.save();

    // record transaction
    const transaction = new Transaction({
      accountId: account._id,
      type: "withdraw",
      amount,
      status
    });

    await transaction.save();

    // send fraud alert email if transaction flagged
    if (status === "flagged") {

      await sendFraudAlertEmail(
        user.email,
        account.accountNumber,
        amount
      );

    }

    res.json({
      message: "Withdrawal successful",
      newBalance: account.balance
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const getTransactionHistory = async (req, res) => {
  try {

    const userId = req.user.id;

    const account = await Account.findOne({ userId });

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    const transactions = await Transaction.find({
      accountId: account._id
    }).sort({ createdAt: -1 });

    res.json(transactions);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};


const generateQR = async (req, res) => {

  try {

    console.log("QR request received:", req.params.accountId);

    const account = await Account.findById(req.params.accountId);

    console.log("Account found:", account);

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    const qrData = JSON.stringify({
      accountNumber: account.accountNumber
    });

    const qrImage = await QRCode.toDataURL(qrData);

    res.json({
      message: "QR Code generated successfully",
      qrCode: qrImage
    });

  } catch (error) {

    console.log("QR ERROR:", error);

    res.status(500).json({
      message: "Error generating QR code",
      error: error.message
    });

  }

};
const getAccountStatus = async (req, res) => {
  try {

    const userId = req.user.id;

    const account = await Account.findOne({ userId });

    if (!account) {
      return res.status(404).json({
        message: "Account not found"
      });
    }

    res.json({
      status: account.status
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};

const verifyQR = async (req, res) => {

  try {

    const { accountNumber } = req.body;

    const account = await Account.findOne({ accountNumber });

    if (!account) {
      return res.json({
        status: "invalid",
        message: "Invalid QR Code"
      });
    }

    const user = await require("../models/User").findById(account.userId);

    if (account.status === "blacklisted") {
      return res.json({
        status: "fraud",
        message: "⚠ Blacklisted account"
      });
    }

    if (account.status === "frozen") {
      return res.json({
        status: "suspicious",
        message: "⚠ Account frozen due to suspicious activity"
      });
    }

    res.json({
      status: "safe",
      accountName: user.name,
      accountNumber: account.accountNumber
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }

};

module.exports = { createAccount, 
                    getBalance, 
                    depositMoney, 
                    withdrawMoney, 
                    getTransactionHistory, 
                    generateQR, 
                    getAccountStatus,
                    verifyQR };