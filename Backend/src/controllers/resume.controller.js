const { PDFParse } = require("pdf-parse");

async function extractResume(req, res) {
    if (!req.file || !req.file.size) {
        return res.status(400).json({ message: "Upload a non-empty PDF in the resume field." });
    }
    // A filename and MIME type can be forged. Check the PDF header too.
    if (req.file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
        return res.status(415).json({ message: "The uploaded file does not have a valid PDF header." });
    }

    const parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
    try {
        const result = await parser.getText();
        // Use individual page text so generated page separators don't count as resume content.
        const text = result.pages.map(page => page.text).join("\n\n").trim();
        if (!text) {
            return res.status(422).json({ message: "No readable text found. Upload a text-based PDF; scanned resumes need OCR, which is not supported yet." });
        }
        res.set("Cache-Control", "no-store");
        return res.status(200).json({
            message: "Resume text extracted. Ready for analysis.",
            resume: { filename: req.file.originalname, pageCount: result.total, text },
            saved: false
        });
    } catch (error) {
        if (error.name === "PasswordException") {
            return res.status(422).json({ message: "This PDF is password-protected. Upload an unlocked copy." });
        }
        return res.status(422).json({ message: "Could not read this PDF. It may be damaged or unsupported. Try exporting it as a new PDF." });
    } finally {
        // Release the parser's resources on both success and failure.
        await parser.destroy().catch(() => {});
    }
}

module.exports = { extractResume };
