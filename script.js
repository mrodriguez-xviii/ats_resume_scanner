// ATS Resume Scanner - script.js
// Keyword-based matching between resume text and job description text

const form = document.getElementById("scanner-form");
const resumeTextEl = document.getElementById("resumeText");
const jobTextEl = document.getElementById("jobText");

const scanBtn = document.getElementById("scanBtn");
const clearBtn = document.getElementById("clearBtn");
const ignoreCommonWordsEl = document.getElementById("ignoreCommonWords");

const scorePill = document.getElementById("scorePill");
const scoreNote = document.getElementById("scoreNote");
const matchedList = document.getElementById("matchedList");
const missingList = document.getElementById("missingList");
const tipsList = document.getElementById("tipsList");

// A lightweight stopword list (common words) to ignore for cleaner keyword extraction
const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","because","been","but","by",
  "can","could","did","do","does","doing","done","for","from","had","has","have",
  "he","her","hers","him","his","how","i","if","in","into","is","it","its","just",
  "like","may","me","more","most","my","new","no","not","of","on","or","our","ours",
  "out","over","she","should","so","some","such","than","that","the","their","theirs",
  "them","then","there","these","they","this","those","to","too","up","us","very",
  "was","we","were","what","when","where","which","who","will","with","you","your","yours"
]);

// Useful "ATS-ish" phrases we want to recognize even if they're multi-word
// (We will try to extract these if they appear in the job description)
const IMPORTANT_PHRASES = [
  "customer support",
  "project management",
  "time management",
  "data analysis",
  "data visualization",
  "process improvement",
  "cross-functional",
  "stakeholder management",
  "communication skills",
  "attention to detail",
  "problem solving",
  "quality control",
  "microsoft excel",
  "google sheets",
  "pivot tables",
  "power bi",
  "tableau",
  "sql",
  "python",
  "html",
  "css",
  "javascript"
];

// Normalize text: lowercase, replace punctuation with spaces, collapse whitespace
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, "")             // remove apostrophes (don't -> dont)
    .replace(/[^a-z0-9+\s-]/g, " ")        // keep letters, numbers, +, spaces, hyphen
    .replace(/\s+/g, " ")
    .trim();
}

// Tokenize into words
function tokenize(text) {
  const clean = normalize(text);
  if (!clean) return [];
  return clean.split(" ").filter(Boolean);
}

// Extract keywords from job description:
// - includes important phrases found
// - includes frequent meaningful words (excluding stopwords)
// - includes short list of top tokens by frequency
function extractKeywords(jobText, ignoreStopwords = true) {
  const cleanJob = normalize(jobText);
  if (!cleanJob) return [];

  const keywords = new Set();

  // 1) Add important phrases that appear in the job description
  for (const phrase of IMPORTANT_PHRASES) {
    const p = normalize(phrase);
    if (p && cleanJob.includes(p)) {
      keywords.add(p);
    }
  }

  // 2) Word frequency for remaining keywords
  const tokens = tokenize(cleanJob);
  const freq = new Map();

  for (const t of tokens) {
    // ignore super short tokens
    if (t.length < 3) continue;

    // ignore stopwords if option enabled
    if (ignoreStopwords && STOPWORDS.has(t)) continue;

    // ignore pure numbers
    if (/^\d+$/.test(t)) continue;

    // keep terms like "c++" and "c#"? Our normalize removes #,
    // but keeps +. We'll keep "c++" if present.
    // (This is a simple scanner; can be improved later.)
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  // Sort words by frequency (desc)
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  // Take top N frequent words as keywords
  const TOP_N = 18;
  for (let i = 0; i < Math.min(TOP_N, sorted.length); i++) {
    keywords.add(sorted[i][0]);
  }

  // Return as array sorted alphabetically for stable UI
  return [...keywords].sort();
}

// Check if a keyword is present in resume text.
// For phrases: simple substring check on normalized resume text.
// For single words: word boundary check.
function isKeywordInResume(keyword, resumeTextNormalized) {
  if (!keyword) return false;

  // phrase = contains space
  if (keyword.includes(" ")) {
    return resumeTextNormalized.includes(keyword);
  }

  // single word: word boundary match
  const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i");
  return pattern.test(resumeTextNormalized);
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Render list items
function renderList(listEl, items, emptyMessage) {
  listEl.innerHTML = "";

  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.className = "hint";
    li.textContent = emptyMessage;
    listEl.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    listEl.appendChild(li);
  }
}

// Generate suggestions based on missing keywords
function generateTips(missing, matchedCount, totalCount) {
  const tips = [];

  if (totalCount === 0) {
    tips.push("Paste a job description with responsibilities + qualifications to extract keywords.");
    return tips;
  }

  const score = Math.round((matchedCount / totalCount) * 100);

  if (score >= 80) {
    tips.push("Your alignment looks strong. Make sure your top bullets include measurable impact (numbers, outcomes).");
  } else if (score >= 60) {
    tips.push("Solid match. Add 2–3 missing keywords naturally into relevant experience bullets (don’t keyword-stuff).");
  } else {
    tips.push("Lower alignment. Consider rewriting your top experience bullets to mirror the job description language (truthfully).");
  }

  if (missing.length > 0) {
    tips.push("Add missing keywords in context: skills section + 1–2 experience bullets where they genuinely apply.");
    tips.push("Prioritize the most job-relevant missing keywords first (tools, core responsibilities, required skills).");
  }

  tips.push("Keep formatting ATS-friendly: simple headings, standard fonts, no tables for the resume itself.");

  return tips;
}

// Main scan logic
function runScan() {
  const resumeRaw = resumeTextEl.value || "";
  const jobRaw = jobTextEl.value || "";

  const resumeNorm = normalize(resumeRaw);
  const ignoreStopwords = ignoreCommonWordsEl.checked;

  // Basic validation
  if (!resumeNorm || !normalize(jobRaw)) {
    scorePill.textContent = "Score: —%";
    scoreNote.textContent = "Please paste both your resume text and a job description.";
    renderList(matchedList, [], "No scan yet.");
    renderList(missingList, [], "No scan yet.");
    renderList(tipsList, ["Paste both texts, then click Scan Resume."], "");
    return;
  }

  const keywords = extractKeywords(jobRaw, ignoreStopwords);

  const matched = [];
  const missing = [];

  for (const kw of keywords) {
    if (isKeywordInResume(kw, resumeNorm)) matched.push(kw);
    else missing.push(kw);
  }

  const total = keywords.length;
  const matchCount = matched.length;
  const score = total === 0 ? 0 : Math.round((matchCount / total) * 100);

  // Update UI
  scorePill.textContent = `Score: ${score}%`;
  scoreNote.textContent = `Matched ${matchCount} of ${total} extracted keywords.`;

  renderList(matchedList, matched, "No matches found yet.");
  renderList(missingList, missing, "No missing keywords — nice.");

  const tips = generateTips(missing, matchCount, total);
  renderList(tipsList, tips, "No suggestions yet.");
}

// Clear logic
function clearAll() {
  resumeTextEl.value = "";
  jobTextEl.value = "";
  scorePill.textContent = "Score: —%";
  scoreNote.textContent = "Scan to see your keyword alignment and suggestions.";
  renderList(matchedList, [], "No scan yet.");
  renderList(missingList, [], "No scan yet.");
  renderList(tipsList, ["Suggestions will show up after a scan."], "");
}

// Events
form.addEventListener("submit", (e) => {
  e.preventDefault();
  runScan();
});

clearBtn.addEventListener("click", () => {
  clearAll();
});

// Optional: enable quick scanning as you type (commented out to keep it simple)
// resumeTextEl.addEventListener("input", runScan);
// jobTextEl.addEventListener("input", runScan);
