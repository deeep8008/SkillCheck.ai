require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const { connectDB } = require("./src/config/database");
const { runtimeConfig } = require("./src/config/runtime");

let server;
let app;
let stopping = false;

async function start() {
    const config = runtimeConfig();
    app = require("./src/app").createApp(config);
    await connectDB();
    if (stopping) { await mongoose.disconnect(); return; }
    await Promise.all([
        require("./src/models/user.model").init(),
        require("./src/models/blacklist.model").init(),
        require("./src/models/report.model").init()
    ]);
    if (stopping) { await mongoose.disconnect(); return; }
    server = app.listen(config.port);
    server.requestTimeout = 60000;
    server.headersTimeout = 15000;
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    console.log(`Server is running on port ${server.address().port}`);
}

function shutdown() {
    if (stopping) return;
    stopping = true;
    if (app) app.locals.shuttingDown = true;
    if (!server) { mongoose.disconnect().catch(() => {}); return; }
    console.log("Shutting down server...");
    const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000);
    deadline.unref();
    server.close(async error => {
        try { await mongoose.disconnect(); process.exitCode = error ? 1 : 0; }
        catch { process.exitCode = 1; }
        finally { clearTimeout(deadline); }
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
start().catch(async error => {
    // Only our configuration errors are safe to show; connection errors may contain secrets.
    console.error(error.code === "CONFIGURATION_ERROR" ? `Server could not start. ${error.message}` : "Server could not start. Check database access, indexes, and whether the port is already in use.");
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
