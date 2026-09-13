const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store of issued certificates (id -> record). A real deployment
// would use a database; this is enough to demonstrate the verification flow.
const certificateStore = new Map();

/**
 * Builds a short, human-readable, hard-to-guess verification code.
 * Format: CERT-XXXXX-XXXXX (uppercase alphanumeric)
 */
function generateCertificateId() {
  const bytes = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `CERT-${bytes.slice(0, 5)}-${bytes.slice(5, 10)}`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Draws the certificate onto a fresh PDF page and returns the PDF bytes.
 */
async function buildCertificatePdf({ studentName, courseName, certificateId, issuedDate }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  const serif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const serifRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const mono = await pdfDoc.embedFont(StandardFonts.Courier);

  const navy = rgb(0.05, 0.09, 0.2);
  const gold = rgb(0.72, 0.58, 0.25);
  const cream = rgb(0.98, 0.96, 0.91);
  const gray = rgb(0.35, 0.35, 0.35);

  // Background
  page.drawRectangle({ x: 0, y: 0, width, height, color: cream });

  // Outer border
  page.drawRectangle({
    x: 24, y: 24, width: width - 48, height: height - 48,
    borderColor: navy, borderWidth: 3,
  });
  // Inner gold border
  page.drawRectangle({
    x: 36, y: 36, width: width - 72, height: height - 72,
    borderColor: gold, borderWidth: 1.5,
  });

  const centerX = width / 2;

  const drawCentered = (text, y, font, size, color = navy) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: centerX - textWidth / 2, y, size, font, color });
  };

  drawCentered('CERTIFICATE OF COMPLETION', height - 100, serif, 26, navy);
  drawCentered('— — —', height - 130, serifRegular, 14, gold);

  drawCentered('This certifies that', height - 175, serifItalic, 14, gray);
  drawCentered(studentName, height - 220, serif, 32, navy);

  drawCentered('has successfully completed the course', height - 260, serifItalic, 14, gray);
  drawCentered(courseName, height - 300, serif, 22, navy);

  drawCentered(`Issued on ${issuedDate}`, height - 345, serifRegular, 12, gray);

  // Verification footer
  drawCentered(`Verification ID: ${certificateId}`, 90, mono, 11, navy);
  drawCentered('Verify this certificate at /verify.html', 72, mono, 9, gray);

  // Decorative seal (simple concentric circles, bottom right)
  const sealX = width - 130;
  const sealY = 110;
  page.drawCircle({ x: sealX, y: sealY, size: 40, borderColor: gold, borderWidth: 2 });
  page.drawCircle({ x: sealX, y: sealY, size: 32, borderColor: gold, borderWidth: 1 });
  const sealFont = serif;
  const sealText = 'VERIFIED';
  const sealTextWidth = sealFont.widthOfTextAtSize(sealText, 8);
  page.drawText(sealText, {
    x: sealX - sealTextWidth / 2, y: sealY - 3, size: 8, font: sealFont, color: gold,
  });

  return pdfDoc.save();
}

/**
 * POST /api/generate-certificate
 * Body: { studentName, courseName, courseCompleted }
 * Only issues a certificate when courseCompleted === true, per spec.
 */
app.post('/api/generate-certificate', async (req, res) => {
  try {
    const { studentName, courseName, courseCompleted } = req.body;

    if (!studentName || !courseName) {
      return res.status(400).json({ error: 'studentName and courseName are required.' });
    }

    if (courseCompleted !== true) {
      return res.status(403).json({
        error: 'Certificate cannot be generated until the course is marked complete.',
      });
    }

    const certificateId = generateCertificateId();
    const issuedAtDate = new Date();
    const issuedDate = formatDate(issuedAtDate);

    const pdfBytes = await buildCertificatePdf({
      studentName: studentName.trim(),
      courseName: courseName.trim(),
      certificateId,
      issuedDate,
    });

    certificateStore.set(certificateId, {
      studentName: studentName.trim(),
      courseName: courseName.trim(),
      issuedAt: issuedAtDate.toISOString(),
    });

    res.json({
      certificateId,
      issuedDate,
      pdfBase64: Buffer.from(pdfBytes).toString('base64'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate certificate.' });
  }
});

/**
 * GET /api/verify/:id
 * Confirms whether a certificate ID was actually issued by this system.
 */
app.get('/api/verify/:id', (req, res) => {
  const record = certificateStore.get(req.params.id.toUpperCase());
  if (!record) {
    return res.status(404).json({ valid: false });
  }
  res.json({ valid: true, ...record });
});

app.listen(PORT, () => {
  console.log(`Certificate Generator running at http://localhost:${PORT}`);
});
