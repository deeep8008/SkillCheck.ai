// ATS keyword coverage — pure text processing, no AI, no external calls.
// Extracts recognizable tech keywords / action verbs from the job description
// and checks which ones appear in the resume text.

// Common stopwords to skip when building the keyword set
const STOPWORDS = new Set([
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "is","are","was","were","be","been","being","have","has","had","do","does",
    "did","will","would","could","should","may","might","shall","can","need",
    "must","that","this","these","those","it","its","we","you","your","our",
    "their","they","he","she","his","her","who","which","what","how","when",
    "where","why","if","as","by","from","into","through","during","before",
    "after","above","below","between","about","against","than","then","so",
    "yet","both","either","not","also","just","more","most","other","some",
    "such","no","nor","only","own","same","too","very","s","t","re","ll","ve",
    "experience","work","working","ability","strong","good","excellent","plus",
    "knowledge","understanding","familiarity","proficiency","skills","skill",
    "looking","seeking","team","teams","company","role","position","candidate",
    "candidates","responsibilities","requirements","qualifications","preferred",
    "required","basic","general","related","relevant","including","etc","eg",
    "ie","e","g","i","x","new","use","using","used","uses","help","make",
    "build","building","write","written","ensure","support","maintain","manage",
    "provide","create","develop","developing","design","designing","implement",
    "implementing","collaborate","collaborating","communicate","communicating",
    "responsible","ability","able","year","years","least","least","minimum",
    "plus","bonus","nice","have","following","like","different","multiple",
    "various","across","within","large","scale","high","low","fast","modern",
]);

// Known multi-word tech phrases to match before single-word tokenization
const PHRASES = [
    "node.js","react.js","next.js","vue.js","express.js","nest.js",
    "type script","type-script","javascript","typescript","python","golang","rust",
    "rest api","rest apis","graphql","grpc","websocket","websockets",
    "sql","nosql","mongodb","postgresql","mysql","redis","elasticsearch","kafka",
    "docker","kubernetes","k8s","terraform","ansible","helm",
    "aws","gcp","azure","cloud","lambda","ec2","s3","cloudfront",
    "ci/cd","ci cd","github actions","gitlab ci","jenkins","circleci",
    "unit test","unit testing","integration test","integration testing","e2e",
    "jest","mocha","vitest","pytest","go test",
    "git","version control","agile","scrum","tdd","bdd",
    "microservices","micro services","monorepo","serverless",
    "linux","bash","shell scripting","shell script",
    "oauth","jwt","authentication","authorization","rbac",
    "machine learning","deep learning","llm","vector database","embedding",
    "react","angular","svelte","tailwind","css","html","sass","webpack","vite",
    "express","fastapi","django","flask","spring","rails",
    "openai","gemini","anthropic","openrouter",
    "socket.io","nginx","apache","load balancer","load balancing",
    "monitoring","observability","logging","tracing","prometheus","grafana","datadog",
    "figma","product","analytics","a/b testing","seo",
];

/**
 * Normalize text for comparison (lowercase, collapse whitespace, strip punctuation except dots/slashes in tech terms)
 */
function normalize(text) {
    return text.toLowerCase().replace(/[^\w\s./\-+#]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract candidate keywords from a JD string.
 * Returns a de-duped array of lowercase keyword strings.
 */
function extractKeywords(jd) {
    const normalized = normalize(jd);
    const found = new Set();

    // 1. Match known multi-word phrases first
    for (const phrase of PHRASES) {
        if (normalized.includes(phrase)) found.add(phrase);
    }

    // 2. Tokenize and keep meaningful single tokens
    const tokens = normalized.split(/\s+/);
    for (const token of tokens) {
        const clean = token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""); // strip leading/trailing non-alnum
        if (
            clean.length >= 2 &&
            !STOPWORDS.has(clean) &&
            // keep tokens with technical chars (dots, slashes, plus, hash) or plain words >=3 chars
            (/[./+#\-]/.test(clean) || clean.length >= 3)
        ) {
            found.add(clean);
        }
    }

    return [...found];
}

/**
 * Check which keywords from `keywords` appear in `resumeText`.
 * Returns { matched, missing, coverage }.
 *
 * @param {string} resumeText
 * @param {string} jd
 * @returns {{ matched: string[], missing: string[], coverage: number }}
 */
function checkAtsCoverage(resumeText, jd) {
    if (!jd?.trim() || !resumeText?.trim()) return null;

    const normalizedResume = normalize(resumeText);
    const keywords = extractKeywords(jd);

    if (keywords.length === 0) return null;

    const matched = [];
    const missing = [];

    for (const kw of keywords) {
        // whole-word boundary check to avoid "go" matching "going"
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i");
        if (pattern.test(normalizedResume)) {
            matched.push(kw);
        } else {
            missing.push(kw);
        }
    }

    const coverage = Math.round((matched.length / keywords.length) * 100);
    return { matched, missing, coverage };
}

module.exports = { checkAtsCoverage };
