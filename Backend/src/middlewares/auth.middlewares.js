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

        // check if token is blacklisted (user already logged out)
        const isBlacklisted = await blacklistTokenModel.findOne({ token });
        if (isBlacklisted) {
            return res.status(401).json({
                message: "Token expired, please login again"
            });
        }

        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();

    } catch (err) {
        return res.status(401).json({
            message: "Invalid token, please login again"
        });
    }
};

module.exports = { authUser };
