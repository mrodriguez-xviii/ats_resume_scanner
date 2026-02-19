// ATS Resume Scanner - script.js
// Keyword-based matching between resume text and job description text
// + PDF/Image upload OCR using PDF.js + Tesseract.js (client-side)

const form = document.getElementById("scanner-form");
const resumeTextEl = document.getElementById("resumeText");
const jobTextEl = document.getElementById("jobText");

const scanBtn = document.getElementById("scanBtn");
const clearBtn = document.getElementById("clearBtn");
const ignoreCommonWordsEl = document.getElementById("ignoreCommonWords");

// file upload input (PDF/image)
const resumeFileEl = document.getElementById("resumeFile");

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
  return (text || "")
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

// Extract keywords from job description
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
    if (t.length < 3) continue;
    if (ignoreStopwords && STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue;

    freq.set(t, (freq.get(t) || 0) + 1);
  }

  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);

  const TOP_N = 18;
  for (let i = 0; i < Math.min(TOP_N, sorted.length); i++) {
    keywords.add(sorted[i][0]);
  }

  return [...keywords].sort();
}

// Check if a keyword is present in resume text.
function isKeywordInResume(keyword, resumeTextNormalized) {
  if (!keyword) return false;

  if (keyword.includes(" ")) {
    return resumeTextNormalized.includes(keyword);
  }

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

  if (!resumeNorm || !normalize(jobRaw)) {
    scorePill.textContent = "Score: —%";
    scoreNote.textContent = "Please paste both your resume text and a job description (or upload a file).";
    renderList(matchedList, [], "No scan yet.");
    renderList(missingList, [], "No scan yet.");
    renderList(tipsList, ["Paste both texts (or upload a resume), then click Scan Resume."], "");
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
  if (resumeFileEl) resumeFileEl.value = ""; // NEW: clears the file input too

  scorePill.textContent = "Score: —%";
  scoreNote.textContent = "Scan to see your keyword alignment and suggestions. (OCR runs locally in your browser.)";
  renderList(matchedList, [], "No scan yet.");
  renderList(missingList, [], "No scan yet.");
  renderList(tipsList, ["Suggestions will show up after a scan."], "");
}

// Configure PDF.js worker (helps avoid errors in some browsers)
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js";
}

let ocrWorker = null;
let ocrInProgress = false;

function setStatus(msg) {
  if (scoreNote) scoreNote.textContent = msg;
}

async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;

  // Create a Tesseract worker once and reuse it (much faster after first load)
  ocrWorker = await Tesseract.createWorker("eng", 1, {
    logger: (m) => {
      if (m && m.status) {
        const pct = m.progress != null ? Math.round(m.progress * 100) : null;
        setStatus(pct != null ? `OCR: ${m.status} (${pct}%)` : `OCR: ${m.status}`);
      }
    }
  });

  return ocrWorker;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function ocrImageDataURL(dataURL) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(dataURL);
  return (data && data.text ? data.text : "").trim();
}

async function pdfToPageDataURLs(file, scale = 2.0) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const pageImages = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    setStatus(`Rendering PDF page ${pageNum}/${pdf.numPages}...`);

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    pageImages.push(canvas.toDataURL("image/png"));
  }

  return pageImages;
}

async function extractTextFromAnyFile(file) {
  if (!file) return "";

  // Image -> OCR
  if (file.type && file.type.startsWith("image/")) {
    setStatus("Loading image for OCR...");
    const dataURL = await fileToDataURL(file);
    setStatus("Running OCR on image...");
    return await ocrImageDataURL(dataURL);
  }

  // PDF -> render pages -> OCR each page
  if (file.type === "application/pdf") {
    if (!window.pdfjsLib) throw new Error("PDF.js not loaded.");

    // scale: higher = better OCR, slower. 2.0 is a good balance.
    const pageDataURLs = await pdfToPageDataURLs(file, 2.0);

    let fullText = "";
    for (let i = 0; i < pageDataURLs.length; i++) {
      setStatus(`Running OCR on PDF page ${i + 1}/${pageDataURLs.length}...`);
      const pageText = await ocrImageDataURL(pageDataURLs[i]);
      if (pageText) fullText += pageText + "\n\n";
    }

    return fullText.trim();
  }

  throw new Error("Unsupported file type. Upload a PDF or image.");
}

// upload handler
if (resumeFileEl) {
  resumeFileEl.addEventListener("change", async () => {
    const file = resumeFileEl.files && resumeFileEl.files[0];
    if (!file) return;

    if (ocrInProgress) {
      alert("OCR is already running. Please wait for it to finish.");
      return;
    }

    // basic size warning
    const mb = file.size / (1024 * 1024);
    if (mb > 20) {
      setStatus(`Large file (${mb.toFixed(1)}MB). OCR may take a bit...`);
    }

    ocrInProgress = true;
    scanBtn.disabled = true;
    clearBtn.disabled = true;

    try {
      setStatus("Starting OCR... (this can take a minute)");
      const text = await extractTextFromAnyFile(file);

      if (!text) {
        setStatus("OCR finished, but no text was detected. Try a clearer image/PDF.");
        return;
      }

      resumeTextEl.value = text;
      setStatus("Resume text extracted! Click Scan Resume ✅");
    } catch (err) {
      console.error(err);
      setStatus("Could not extract text. Try another file or paste text manually.");
    } finally {
      ocrInProgress = false;
      scanBtn.disabled = false;
      clearBtn.disabled = false;
    }
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  runScan();
});

clearBtn.addEventListener("click", () => {
  clearAll();
});
