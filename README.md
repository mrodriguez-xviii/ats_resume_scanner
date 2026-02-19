**ATS Resume Scanner**

A web-based ATS (Applicant Tracking System) simulator that analyzes keyword alignment between a resume and a job description.

This tool allows users to paste text or upload a PDF/image of their resume, extract content using OCR, and receive a keyword match score with actionable suggestions.

Availible through GitHub Pages at: https://mrodriguez-xviii.github.io/ats_resume_scanner/

**Project Overview**

This project simulates a simplified keyword-based ATS screening process.

**Users can:**

- Paste resume text manually

- Upload a PDF (including scanned PDFs)

- Upload an image (PNG/JPG) of a resume

- Paste a job description

**Generate:**

- Match score (%)

- Matched keywords

- Missing keywords

- Resume improvement suggestions

**Tech Stack:**

- HTML5

- CSS3

- Vanilla JavaScript

- PDF.js (PDF rendering)

- Tesseract.js (Client-side OCR)

No backend required. Fully deployable via GitHub Pages.

**How It Works:**

The job description is analyzed to extract:

- Frequently occurring keywords

- Recognized multi-word industry phrases

- The resume text is normalized and compared against extracted keywords.

- A keyword match percentage is calculated.

- Missing keywords and contextual improvement suggestions are generated.

**If a PDF/image is uploaded:**

- PDF pages are rendered using PDF.js

- Tesseract.js performs OCR on each page

- Extracted text is auto-filled into the resume field
