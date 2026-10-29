const multer = require("multer");

// Keep one small PDF in memory; nothing is written to disk.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    fileFilter(req, file, callback) {
        if (!file.originalname.toLowerCase().endsWith(".pdf") || file.mimetype !== "application/pdf") {
            const error = new Error("Upload a PDF file using the resume field.");
            error.status = 415;
            return callback(error);
        }
        callback(null, true);
    }
}).single("resume");

function uploadResume(req, res, next) {
    upload(req, res, (error) => {
        if (!error) return next();
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ message: "Resume must be 3 MB or smaller." });
        }
        return res.status(error.status || 400).json({
            message: error.status === 415 ? error.message : "Send exactly one PDF in the resume field, with no extra fields."
        });
    });
}

module.exports = { uploadResume };
