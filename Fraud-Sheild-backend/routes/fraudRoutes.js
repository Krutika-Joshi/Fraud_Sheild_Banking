const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { getFraudAlerts, 
        verifyAccount, 
        blacklistAccount, 
        reviewTransaction, 
        freezeAccount, 
        monthlyFraudReport,
        highRiskUsers,
        fraudScoreReport,
        verifyQR } = require("../controllers/fraudController");


router.get("/alerts", authMiddleware, roleMiddleware("admin"), getFraudAlerts);

router.post(
  "/blacklist-account/:accountId",
  authMiddleware,
  roleMiddleware("admin"),
  blacklistAccount
);

router.post(
  "/freeze-account/:accountId",
  authMiddleware,
  roleMiddleware("admin"),
  freezeAccount
);

router.post(
  "/review-transaction/:transactionId",
  authMiddleware,
  roleMiddleware("admin"),
  reviewTransaction
);

router.get(
  "/monthly-report",
  authMiddleware,
  roleMiddleware("admin"),
  monthlyFraudReport
);

router.get(
  "/high-risk-users",
  authMiddleware,
  roleMiddleware("admin"),
  highRiskUsers
);

router.get(
  "/fraud-score-report",
  authMiddleware,
  roleMiddleware("admin"),
  fraudScoreReport
);

router.post("/verify-qr", authMiddleware, verifyQR);

router.post("/verify-account", authMiddleware, verifyAccount);

module.exports = router;