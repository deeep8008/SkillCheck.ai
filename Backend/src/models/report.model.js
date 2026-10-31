const mongoose = require("mongoose");
const { validateReport } = require("../services/analysis.schema");

const reportSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
    targetRole: { type: String, required: true, maxlength: 120 },
    resumeText: { type: String, required: true, maxlength: 20000 },
    jobDescription: { type: String, default: "", maxlength: 5000 },
    model: { type: String, required: true, maxlength: 200 },
    report: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        validate: {
            validator(value) { return validateReport(value, this.resumeText || ""); },
            message: "Report structure or resume evidence is invalid."
        }
    }
}, { timestamps: true, bufferCommands: false });

reportSchema.index({ owner: 1, createdAt: -1, _id: -1 });
module.exports = mongoose.model("AnalysisReport", reportSchema);
