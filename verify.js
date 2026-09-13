const form = document.getElementById('verify-form');
const statusEl = document.getElementById('verify-status');
const resultEl = document.getElementById('verify-result');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  statusEl.className = 'status';
  resultEl.classList.add('hidden');

  const certId = document.getElementById('certId').value.trim();
  if (!certId) return;

  statusEl.textContent = 'Checking…';
  statusEl.className = 'status info';

  try {
    const response = await fetch(`/api/verify/${encodeURIComponent(certId)}`);
    const data = await response.json();

    if (!response.ok || !data.valid) {
      statusEl.textContent = 'No certificate found with that ID. Double-check and try again.';
      statusEl.className = 'status error';
      return;
    }

    statusEl.textContent = '';
    document.getElementById('v-name').textContent = `Issued to: ${data.studentName}`;
    document.getElementById('v-course').textContent = `Course: ${data.courseName}`;
    document.getElementById('v-date').textContent = `Issued: ${new Date(data.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    resultEl.classList.remove('hidden');
  } catch (err) {
    statusEl.textContent = 'Verification failed. Please try again.';
    statusEl.className = 'status error';
  }
});
