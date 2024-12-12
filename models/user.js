const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contributions: [{ type: String }] // Add this line for contributions
});

module.exports = mongoose.model('User', userSchema);
