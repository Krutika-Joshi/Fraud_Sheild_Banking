const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  accountNumber: {
    type: String,
    unique: true
  },

  balance: {
    type: Number,
    default: 0
  },

  status: {
    type: String,
    enum: ["active", "frozen", "blacklisted"],
    default: "active"
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Account", accountSchema);