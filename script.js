const form = document.getElementById('cert-form');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const generateBtn = document.getElementById('generate-btn');

function base64ToBlobUrl(base64, mime) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mime });
  return URL.createObjectURL(blob);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  statusEl.className = 'status';
  resultEl.classList.add('hidden');

  const studentName = document.getElementById('studentName').value.trim();
  const courseName = document.getElementById('courseName').value.trim();
  const courseCompleted = document.getElementById('courseCompleted').checked;

  if (!studentName || !courseName) {
    statusEl.textContent = 'Please fill in both the recipient name and course title.';
    statusEl.className = 'status error';
    return;
  }

  if (!courseCompleted) {
    statusEl.textContent = 'The course must be marked complete before a certificate can be generated.';
    statusEl.className = 'status error';
    return;
  }

  generateBtn.disabled = true;
  statusEl.textContent = 'Generating certificate…';
  statusEl.className = 'status info';

  try {
    const response = await fetch('/api/generate-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentName, courseName, courseCompleted }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.');
    }

    statusEl.textContent = '';

    const blobUrl = base64ToBlobUrl(data.pdfBase64, 'application/pdf');
    const downloadLink = document.getElementById('download-link');
    downloadLink.href = blobUrl;
    downloadLink.download = `certificate-${data.certificateId}.pdf`;

    document.getElementById('result-id-value').textContent = data.certificateId;
    document.getElementById('result-date-value').textContent = `Issued ${data.issuedDate}`;

    resultEl.classList.remove('hidden');
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.className = 'status error';
  } finally {
    generateBtn.disabled = false;
  }
});
