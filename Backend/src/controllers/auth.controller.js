const userModel = require("../models/user.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const blacklistTokenModel = require("../models/blacklist.model");

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
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

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.cookie("token", token);

        return res.status(201).json({
            message: "User registered successfully",
            user
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid password"
            });
        }
        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.cookie("token", token);
        return res.status(200).json({
            message: "User logged in successfully",
            user: {
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        console.log(err);
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
        res.clearCookie("token");
        return res.status(200).json({
            message: "User logged out successfully"
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

const getUser = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        return res.status(200).json({
            message: "User found successfully",
            user
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Internal server error"
        });
    }
};

module.exports = { registerUser, loginUser, logoutUser, getUser };
