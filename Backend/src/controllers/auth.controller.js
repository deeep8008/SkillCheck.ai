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

const googleAuth = async (req, res) => {
    try {
        const { credential, accessToken, mode = "login" } = req.body || {};
        if (
            (typeof credential !== "string" || !credential.trim()) &&
            (typeof accessToken !== "string" || !accessToken.trim())
        ) {
            return res.status(400).json({ message: "Google authorization token is required" });
        }

        let email = "";
        let googleId = "";
        let name = "";

        if (accessToken?.trim()) {
            // Verify via Google's userinfo endpoint using accessToken
            let response;
            try {
                response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${accessToken.trim()}` },
                    signal: AbortSignal.timeout(10000)
                });
            } catch {
                return res.status(503).json({ message: "Could not reach Google verification servers. Please try again." });
            }

            if (!response.ok) {
                return res.status(401).json({ message: "Invalid or expired Google authorization" });
            }

            const info = await response.json();
            if (info.email_verified !== true && info.email_verified !== "true") {
                return res.status(400).json({ message: "Google email is not verified" });
            }
            email = String(info.email || "").toLowerCase().trim();
            googleId = String(info.sub || "").trim();
            name = String(info.name || "").trim();
        } else {
            // Verify via Google's tokeninfo endpoint using ID token credential
            const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`;
            let response;
            try {
                response = await fetch(verifyUrl, { signal: AbortSignal.timeout(10000) });
            } catch {
                return res.status(503).json({ message: "Could not reach Google verification servers. Please try again." });
            }

            if (!response.ok) {
                return res.status(401).json({ message: "Invalid or expired Google credential" });
            }

            const payload = await response.json();

            const expectedClientId = process.env.GOOGLE_CLIENT_ID?.trim();
            if (expectedClientId && payload.aud !== expectedClientId) {
                return res.status(401).json({ message: "Google token was not issued for this application" });
            }

            if (payload.email_verified !== "true" && payload.email_verified !== true) {
                return res.status(400).json({ message: "Google email is not verified" });
            }

            email = String(payload.email || "").toLowerCase().trim();
            googleId = String(payload.sub || "").trim();
            name = String(payload.name || "").trim();
        }

        if (!email || !googleId) {
            return res.status(400).json({ message: "Incomplete Google profile data" });
        }

        let user = await userModel.findOne({
            $or: [{ googleId }, { email }]
        });

        // Mode-specific validation
        if (mode === "register") {
            if (user) {
                return res.status(409).json({
                    message: "An account with this email already exists. Please sign in instead."
                });
            }

            // Create new user for registration
            const rawName = (name || email.split("@")[0] || "user")
                .toLowerCase()
                .replace(/[^a-zA-Z0-9_.-]/g, "")
                .slice(0, 30);
            const base = rawName.length >= 3 ? rawName : `user_${randomUUID().slice(0, 6)}`;

            let username = base;
            let counter = 0;
            while (await userModel.exists({ username })) {
                username = `${base.slice(0, 25)}_${randomUUID().slice(0, 4)}`;
                if (++counter > 10) break;
            }

            user = await userModel.create({
                username,
                email,
                googleId
            });
        } else {
            // mode === "login"
            if (!user) {
                return res.status(401).json({
                    message: "No account found with this Google email. Please initialize an account first."
                });
            }

            // If user existed by email (e.g. registered with password), attach googleId
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d", jwtid: randomUUID() }
        );
        res.cookie("token", token, { ...authCookieOptions(), maxAge: 86400000 });

        return res.status(mode === "register" ? 201 : 200).json({
            message: mode === "register" ? "User registered successfully" : "Signed in with Google successfully",
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

module.exports = { registerUser, loginUser, logoutUser, getUser, googleAuth };
