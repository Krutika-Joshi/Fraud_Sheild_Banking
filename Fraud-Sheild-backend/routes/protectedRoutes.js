const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

router.get("/me", authMiddleware, (req, res) => {
    res.json({
        id: req.user.id,
        role: req.user.role
    });
});

router.get("/dashboard", authMiddleware, (req, res) => {

  res.json({
    message: "Welcome to Fraud Shield Banking Dashboard",
    user: req.user
  });

});

module.exports = router;