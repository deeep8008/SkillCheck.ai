const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const blacklistTokenModel = require("../models/blacklist.model");
const { authCookieOptions } = require("../config/auth-cookie");
const { randomUUID } = require("node:crypto");

const registerUser = async (req, res) => {
    try {
        const { username: rawUsername, email: rawEmail, password } = req.body || {};

        if (typeof rawUsername !== "string" || typeof rawEmail !== "string" || typeof password !== "string") {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const username = rawUsername.trim();
        const email = rawEmail.trim().toLowerCase();
        if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)) {
            return res.status(400).json({ message: "Username must be 3–40 letters, numbers, dots, underscores or hyphens." });
        }
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Enter a valid email address." });
        }
        if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ message: "Password must have at least 8 characters and fit within 72 UTF-8 bytes." });
        }
        const isUserAlready = await userModel.findOne({
            $or: [{ username }, { email }]
        });

        if (isUserAlready) {
            if (isUserAlready.username === username) {
                return res.status(409).json({
                    message: "Username already exists"
                });
            }

            if (isUserAlready.email === email) {
                return res.status(409).json({
                    message: "Email already exists"
                });
            }
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await userModel.create({
            username,
            email,
            password: hashedPassword
        });

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1d", jwtid: randomUUID() });
        res.cookie("token", token, { ...authCookieOptions(), maxAge: 86400000 });

        return res.status(201).json({
            message: "User registered successfully",
            user
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        }
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { identifier, username, email, password } = req.body || {};
        const account = identifier ?? username ?? email;
        if (typeof account !== "string" || !account.trim() || typeof password !== "string" || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        if (account.length > 254 || Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({ message: "Login input is too long." });
        }
        const user = await userModel.findOne({
            $or: [{ username: account.trim() }, { email: account.trim().toLowerCase() }]
        }).select("+password");
        if (!user) {
            return res.status(401).json({
                message: "Invalid username/email or password"
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid username/email or password"
            });
        }
        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1d", jwtid: randomUUID() });
        res.cookie("token", token, { ...authCookieOptions(), maxAge: 86400000 });
        return res.status(200).json({
            message: "User logged in successfully",
            user: {
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const logoutUser = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (token) {
            await blacklistTokenModel.create({ token });
        }
        res.clearCookie("token", authCookieOptions());
        return res.status(200).json({
            message: "User logged out successfully"
        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(401).json({ message: "Account no longer exists. Please sign in again." });
        }
        return res.status(200).json({
            message: "User found successfully",
            user
        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = { registerUser, loginUser, logoutUser, getUser };
