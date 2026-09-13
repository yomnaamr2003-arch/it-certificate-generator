# 🎓 Certificate Generator for Course Completion

A small full-stack system that generates a downloadable PDF certificate — complete with the recipient's name, course title, and a unique verification ID — the moment a course is marked complete.

Built as a daily task for the Web Development Internship at **Veda Technology**.

---

## ✦ Overview

| | |
|---|---|
| **Description** | Generates a downloadable PDF certificate with the user's name and course details upon course completion. |
| **Objective** | Practice dynamic PDF generation, canvas/PDF libraries, and completion-triggered workflows. |
| **Stack** | HTML5, CSS3, JavaScript, Node.js, Express.js, [pdf-lib](https://pdf-lib.js.org/) |

## ✦ Features

- 📝 **Certificate template** with dynamically injected name and course fields
- 🚦 **Completion-triggered generation** — the server refuses to issue a certificate unless the course is flagged as complete (HTTP 403 otherwise), regardless of what the client sends
- 📄 **Server-side PDF generation** using `pdf-lib`, returned as a downloadable file
- 🔑 **Unique verification ID** (`CERT-XXXXX-XXXXX`) stamped on every certificate
- 🔍 **Verification page** where anyone can paste an ID and confirm it was genuinely issued
- 🎨 Academic parchment-and-wax-seal visual theme, distinct from prior task projects

## ✦ Project Structure

```
certificate-generator/
├── server.js              # Express server: generation + verification endpoints
├── package.json
└── public/
    ├── index.html          # Certificate generator form
    ├── verify.html         # Verification lookup page
    ├── style.css           # Shared parchment/navy/gold theme
    ├── script.js           # Generator page logic
    └── verify.js           # Verification page logic
```

## ✦ How It Works

1. The user fills in a **recipient name** and **course title**, and checks a box confirming the course is complete.
2. The frontend POSTs this to `/api/generate-certificate`.
3. The **server independently validates** `courseCompleted === true` before doing anything — this is the actual enforcement point, not the checkbox. A request without it is rejected with a `403`.
4. On success, the server:
   - Generates a random verification ID (`crypto.randomBytes`)
   - Draws a certificate onto a fresh A4-landscape PDF page with `pdf-lib` (borders, serif typography, a decorative seal, and the verification ID)
   - Stores `{ certificateId → studentName, courseName, issuedAt }` server-side
   - Returns the PDF as base64
5. The browser turns that base64 into a `Blob` and triggers a download — no client-side PDF library needed.
6. Anyone can later visit `/verify.html`, enter the ID printed on the certificate, and the server confirms (or denies) that it was actually issued.

## ✦ Running Locally

```bash
npm install
node server.js
```

Then open `http://localhost:3000`.

> **Note on Windows downloads:** if you download this project as a ZIP, Windows sometimes appends a stray number to re-downloaded files (e.g. `style (1).css`). If styles don't load, check that `public/style.css` is named exactly that — no suffix — and that `index.html`'s `<link>` tag matches.

## ✦ API Reference

### `POST /api/generate-certificate`

```json
{
  "studentName": "Yomna Amr",
  "courseName": "Advanced Web Development",
  "courseCompleted": true
}
```

**200 OK**
```json
{
  "certificateId": "CERT-313A4-6EDA9",
  "issuedDate": "September 13, 2026",
  "pdfBase64": "..."
}
```

**403 Forbidden** — when `courseCompleted` is not `true`:
```json
{ "error": "Certificate cannot be generated until the course is marked complete." }
```

### `GET /api/verify/:id`

**200 OK**
```json
{ "valid": true, "studentName": "...", "courseName": "...", "issuedAt": "..." }
```

**404 Not Found**
```json
{ "valid": false }
```

## ✦ Interview Questions — Notes

**How would you generate a PDF dynamically with user-specific data?**
Rather than drawing on an HTML `<canvas>` and exporting an image, this project generates the PDF natively on the server with `pdf-lib`: a blank page is created, and text/shapes are drawn onto it using coordinates, with the recipient's name and course interpolated directly into the draw calls. This keeps the PDF a real, selectable/vector document rather than a rasterized screenshot, and keeps certificate logic off the client entirely.

**How would you verify a certificate's authenticity?**
Each certificate gets a random, hard-to-guess ID generated with `crypto.randomBytes` (not a predictable sequence like an incrementing integer). The server keeps a record of every ID it has actually issued. Verification is just a lookup: if the ID isn't in that record, the certificate is not authentic — the PDF itself is never trusted as the source of truth, only the server's own log of what it generated.

**How would you prevent certificate generation before course completion?**
By never trusting the client. The checkbox in the UI is just a UX nicety — the real gate is server-side: `/api/generate-certificate` explicitly checks `courseCompleted === true` and returns `403` otherwise, before any PDF work happens. In a production system this flag would come from the actual course-progress record in a database rather than from the request body, so a user couldn't just edit the payload to bypass it.
