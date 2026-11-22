/**
 * Dashboard Overview Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const statTotal = document.getElementById('stat-total');
  const statSent = document.getElementById('stat-sent');
  const statFailed = document.getElementById('stat-failed');
  const statToday = document.getElementById('stat-today');
  const statSuccessRate = document.getElementById('stat-success-rate');
  const recentTableBody = document.getElementById('recent-messages-tbody');
  const emptyState = document.getElementById('empty-recent-state');
  const bannerAccountName = document.getElementById('banner-account-name');
  const bannerStatusText = document.getElementById('banner-status-text');

  function updateDashboardStats(stats) {
    if (!stats) return;
    if (statTotal) statTotal.textContent = stats.total ?? 0;
    if (statSent) statSent.textContent = stats.sent ?? 0;
    if (statFailed) statFailed.textContent = stats.failed ?? 0;
    if (statToday) statToday.textContent = stats.sentToday ?? 0;
    if (statSuccessRate) statSuccessRate.textContent = `${stats.successRate ?? 100}%`;
  }

  // Socket listener for stats
  if (window.appSocket) {
    window.appSocket.on('dashboard:stats', (stats) => {
      updateDashboardStats(stats);
    });

    window.appSocket.on('message:sent', (data) => {
      prependRecentMessage(data, 'sent');
    });

    window.appSocket.on('message:failed', (data) => {
      prependRecentMessage(data, 'failed');
    });

    window.appSocket.on('whatsapp:status', (data) => {
      if (bannerStatusText) bannerStatusText.textContent = data.status.toUpperCase();
      if (data.accountInfo && bannerAccountName) {
        bannerAccountName.textContent = data.accountInfo.name || data.accountInfo.formattedPhone || '';
      }
    });
  }

  function prependRecentMessage(data, status) {
    if (!recentTableBody) return;
    if (emptyState) emptyState.style.display = 'none';

    const tr = document.createElement('tr');
    tr.style.animation = 'slideIn 0.3s ease-out';

    const statusBadge = status === 'sent'
      ? `<span class="badge badge-success">SENT</span>`
      : `<span class="badge badge-danger">FAILED</span>`;

    const iconMap = {
      text: '💬 Text',
      image: '🖼️ Image',
      video: '🎥 Video',
      document: '📄 Document'
    };

    tr.innerHTML = `
      <td><span class="table-recipient">${data.recipient}</span></td>
      <td><span class="badge badge-info">${iconMap[data.messageType] || data.messageType}</span></td>
      <td><span class="table-content-preview">${data.content || (status === 'failed' ? data.error : 'Media Dispatch')}</span></td>
      <td>${statusBadge}</td>
      <td style="font-size:0.75rem; color:var(--text-muted);">Just now</td>
    `;

    recentTableBody.insertBefore(tr, recentTableBody.firstChild);
  }
});
