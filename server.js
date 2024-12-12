// Load environment variables from .env file
require('dotenv').config(); 
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const mongoose = require("mongoose"); // Import mongoose

const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable for port if available

// MongoDB connection
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/registration-login"; // Default URI if env variable is not set
mongoose.connect(uri)
    .then(() => console.log('MongoDB connected!'))
    .catch(err => console.error('MongoDB connection error:', err));

// User schema and model
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contributions: [{ type: String }] // Add this line for contributions
});

const User = mongoose.model('User', userSchema);

// Secret Key for JWT from environment variable
const SECRET_KEY = process.env.SECRET_KEY; // Use the key from the .env file

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve frontend files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Registration route
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }

    // Ensure the password meets criteria
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Hash the password
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Save the user to the database
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Login route
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    // Find the user
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the stored hashed password
    try {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Generate a token
        const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: "1h" });
        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Middleware to verify token for secure routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Access token missing" });
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }
        req.user = user;
        next();
    });
}

// Add contribution route
app.post("/contribution", authenticateToken, async (req, res) => {
    const { contribution } = req.body; // Extract contribution from the request body

    if (!contribution) {
        return res.status(400).json({ message: "Contribution data is required" });
    }

    try {
        // Update the user's contributions array
        await User.findOneAndUpdate(
            { username: req.user.username },
            { $push: { contributions: contribution } }
        );
        res.status(200).json({ message: "Contribution added successfully" });
    } catch (error) {
        console.error("Error adding contribution:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get contributions route
app.get("/contribution", authenticateToken, async (req, res) => {
    try {
        // Find the user and return their contributions
        const user = await User.findOne({ username: req.user.username }, "contributions");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ contributions: user.contributions });
    } catch (error) {
        console.error("Error fetching contributions:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update password route
app.put("/update-password", authenticateToken, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Validate new password criteria
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    try {
        // Find the user
        const user = await User.findOne({ username: req.user.username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Error updating password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Reset password route (simple version)
app.post("/reset-password", async (req, res) => {
    const { username, newPassword } = req.body;

    // Validate new password criteria
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters long" });
    }

    try {
        // Find the user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Example secure routes
app.get("/administration", authenticateToken, (req, res) => {
    res.json({ message: `Welcome to Administration, ${req.user.username}` });
});

app.get("/profile", authenticateToken, (req, res) => {
    res.json({ message: `Profile details for ${req.user.username}` });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
