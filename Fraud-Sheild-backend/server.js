require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const accountRoutes = require("./routes/accountRoutes");
const fraudRoutes = require("./routes/fraudRoutes");


const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/fraud", fraudRoutes);

app.get("/", (req, res) => {
  res.send("Fraud Shield Banking API Running");
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});