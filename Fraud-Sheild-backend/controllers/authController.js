const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const registerUser = async (req, res) => {
  try {

    const { name, email, password } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create new user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully"
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;

    // check if user exists
    const user = await User.findOne({ email });


    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // capture login IP
      const ipAddress = req.ip;

      // store IP in user record
      user.lastLoginIP = ipAddress;

      await user.save();

    // access token
    const accessToken = jwt.sign(
      {
        id: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // refresh token
    const refreshToken = jwt.sign(
      {
        id: user._id
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      accessToken,
      refreshToken
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

const refreshAccessToken = async (req, res) => {
  try {

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {

      if (err) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const newAccessToken = jwt.sign(
        {
          id: decoded.id
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );

      res.json({
        accessToken: newAccessToken
      });

    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
};

module.exports = { registerUser, loginUser, refreshAccessToken };