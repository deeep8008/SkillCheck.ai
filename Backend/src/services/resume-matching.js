const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

function passages(text) {
    return text.split(/\r?\n|[•▪]/u)
        .flatMap(line => Array.from(sentences.segment(line), ({ segment }) => segment.trim()))
        .flatMap(sentence => sentence.match(/.{1,500}(?:\s+|$)|.{1,500}/gu) ?? [])
        .filter(chunk => /[\p{L}\p{N}]/u.test(chunk));
}

async function shortlistEvidence(resumeText, jobDescription, request) {
    const bullets = [...new Set(passages(resumeText))].slice(0, 160);
    const jobPassages = passages(jobDescription);
    const requirements = jobPassages.slice(0, 48);
    if (!bullets.length || !requirements.length) return { resumeBullets: {}, requirementCandidates: [], jobDescription };

    const input = [...requirements, ...bullets];
    const { data } = await request("embeddings", {
        model: EMBEDDING_MODEL, input, encoding_format: "float", dimensions: 256
    }, 8000);
    if (!Array.isArray(data) || data.length !== input.length) return null;

    const vectors = new Map();
    const dimensions = data[0]?.embedding?.length;
    for (const item of data) {
        const { index, embedding } = item ?? {};
        if (!Number.isInteger(index) || index < 0 || index >= input.length || vectors.has(index)
            || !dimensions || dimensions > 256 || !Array.isArray(embedding) || embedding.length !== dimensions
            || !embedding.every(Number.isFinite)) return null;
        const norm = Math.hypot(...embedding);
        if (!norm || !Number.isFinite(norm)) return null;
        vectors.set(index, embedding.map(value => value / norm));
    }

    const resumeBullets = {};
    const requirementCandidates = requirements.map((jobExcerpt, index) => {
        const query = vectors.get(index);
        const resumeBulletIds = bullets.map((_, bulletIndex) => ({
            bulletIndex,
            score: vectors.get(requirements.length + bulletIndex)
                .reduce((sum, value, dimension) => sum + value * query[dimension], 0)
        })).sort((a, b) => b.score - a.score).slice(0, 2).map(({ bulletIndex }) => {
            const id = String(bulletIndex + 1);
            resumeBullets[id] = bullets[bulletIndex];
            return id;
        });
        return { jobExcerpt, resumeBulletIds };
    });
    // The ordered excerpts already contain the posting unless we hit the retrieval limit.
    return {
        resumeBullets, requirementCandidates,
        ...(jobPassages.length > requirements.length ? { jobDescription } : {})
    };
}

function usesShortlistedEvidence(report, { resumeBullets, requirementCandidates }) {
    const normalize = text => text.replace(/\s+/g, " ").trim();
    const contains = (passage, quote) => normalize(passage).includes(normalize(quote));
    const allBullets = Object.values(resumeBullets);
    const matches = (jobQuote, resumeQuote) => requirementCandidates.some(candidate =>
        contains(candidate.jobExcerpt, jobQuote) && (resumeQuote === null ||
            candidate.resumeBulletIds.some(id => contains(resumeBullets[id], resumeQuote)))
    );

    return report.requirementMap.every(row => matches(row.jobQuote, row.resumeQuote))
        && [...report.strengths, ...report.gaps, ...report.screeningConcerns].every(finding => {
            if (finding.evidence === null) return true;
            if (finding.requirementEvidence !== null) return matches(finding.requirementEvidence, finding.evidence);
            return allBullets.some(bullet => contains(bullet, finding.evidence));
        });
}

module.exports = { shortlistEvidence, usesShortlistedEvidence };
