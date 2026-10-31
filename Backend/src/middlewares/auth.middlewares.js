const jwt = require("jsonwebtoken");
const blacklistTokenModel = require("../models/blacklist.model");

const authUser = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: "Token not found, please login"
            });
        }

        // Reject invalid/expired tokens before making a database query.
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).json({ message: "Invalid token, please login again" });
    }

    try {
        const token = req.cookies.token;
        // Check whether this valid token has been logged out.
        const isBlacklisted = await blacklistTokenModel.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                message: "Token expired, please login again"
            });
        }

        next();

    } catch (err) {
        return res.status(503).json({
            message: "Authentication is temporarily unavailable. Please try again."
        });
    }
};

module.exports = { authUser };
