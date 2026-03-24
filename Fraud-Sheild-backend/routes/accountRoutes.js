const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { createAccount, getBalance, depositMoney, withdrawMoney, getTransactionHistory,
        generateQR, getAccountStatus, verifyQR
} = require("../controllers/accountController");

router.post("/create", authMiddleware, createAccount);

router.get("/balance", authMiddleware, getBalance);

router.post("/deposit", authMiddleware, depositMoney);

router.post("/withdraw", authMiddleware, withdrawMoney);

router.get("/transactions", authMiddleware, getTransactionHistory);

router.get("/generate-qr/:accountId", authMiddleware, generateQR);

router.get("/status", authMiddleware, getAccountStatus);

router.post("/verify-qr", authMiddleware, verifyQR);

module.exports = router;