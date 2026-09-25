document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy],[data-share]');
  if (!button) return;
  const url = button.dataset.copy || button.dataset.share;
  try {
    if (button.dataset.share && navigator.share) await navigator.share({ title: 'Tambola Circle for Android', url });
    else { await navigator.clipboard.writeText(url); const notice = document.querySelector('#notice'); notice.textContent = 'Download link copied'; notice.hidden = false; setTimeout(() => { notice.hidden = true; }, 3000); }
  } catch (error) {
    if (error.name === 'AbortError') return;
    const notice = document.querySelector('#notice'); notice.textContent = 'Copy this link: ' + url; notice.hidden = false;
  }
});
