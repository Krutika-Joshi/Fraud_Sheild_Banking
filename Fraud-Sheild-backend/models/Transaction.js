const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    required: true
  },

  type: {
    type: String,
    enum: ["deposit", "withdraw", "credit", "debit"],
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ["success", "flagged","approved", "rejected"],
    default: "success"
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);