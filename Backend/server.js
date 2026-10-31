require("dotenv").config();
const app = require("./src/app");
const { connectDB } = require("./src/config/database");

const PORT = process.env.PORT || 3000;
async function start() {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
        throw new Error("Missing server configuration");
    }
    await connectDB();
    await Promise.all([
        require("./src/models/user.model").init(),
        require("./src/models/blacklist.model").init(),
        require("./src/models/report.model").init()
    ]);
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

start().catch(() => {
    // Avoid logging database URLs or other credentials from connection errors.
    console.error("Server could not start. Check MONGO_URI, JWT_SECRET, and database access.");
    process.exitCode = 1;
});
