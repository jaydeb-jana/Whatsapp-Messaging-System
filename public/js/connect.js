/**
 * Multi-Account WhatsApp Connection Manager Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const qrCard = document.getElementById('qr-card');
  const connectedCard = document.getElementById('connected-card');
  const qrImage = document.getElementById('qr-image');
  const qrPlaceholder = document.getElementById('qr-placeholder');
  const qrCountdownEl = document.getElementById('qr-countdown');
  const btnConnect = document.getElementById('btn-connect');
  const btnDisconnect = document.getElementById('btn-disconnect');
  const btnRefreshQr = document.getElementById('btn-refresh-qr');
  const connectionStatePill = document.getElementById('connection-state-pill');
  const connectedAccountName = document.getElementById('connected-account-name');
  const connectedAccountPhone = document.getElementById('connected-account-phone');
  const connectedAccountTime = document.getElementById('connected-account-time');
  const connectedSlotLabel = document.getElementById('connected-slot-label');
  const activeSlotName = document.getElementById('active-slot-name');
  const connectedCountPill = document.getElementById('connected-count-pill');

  let activeSessionId = window.currentSessionId || 'account_1';
  let activeSlot = window.currentSlot || 1;
  let countdownInterval = null;
  let remainingSeconds = 45;

  function startCountdown(seconds = 45) {
    if (countdownInterval) clearInterval(countdownInterval);
    remainingSeconds = seconds;
    if (qrCountdownEl) qrCountdownEl.textContent = `${remainingSeconds}s`;

    countdownInterval = setInterval(() => {
      remainingSeconds -= 1;
      if (qrCountdownEl) {
        qrCountdownEl.textContent = `${remainingSeconds}s`;
      }
      if (remainingSeconds <= 0) {
        clearInterval(countdownInterval);
        if (qrCountdownEl) qrCountdownEl.textContent = 'Expired. Refreshing...';
      }
    }, 1000);
  }

  function displayQR(dataUrl, expirySeconds = 45) {
    if (!qrImage) return;
    qrImage.src = dataUrl;
    qrImage.style.display = 'block';
    if (qrPlaceholder) qrPlaceholder.style.display = 'none';
    startCountdown(expirySeconds);
  }

  function renderActiveSlotStatus(data) {
    const status = data.status || 'disconnected';

    if (connectionStatePill) {
      connectionStatePill.textContent = status.toUpperCase();
      connectionStatePill.className = `badge badge-${
        status === 'connected' ? 'success' : status === 'disconnected' ? 'danger' : 'warning'
      }`;
    }

    if (activeSlotName) {
      activeSlotName.textContent = data.label || `Account ${activeSlot}`;
    }

    if (status === 'connected') {
      if (qrCard) qrCard.style.display = 'none';
      if (connectedCard) connectedCard.style.display = 'flex';
      if (btnConnect) btnConnect.style.display = 'none';
      if (btnDisconnect) btnDisconnect.style.display = 'inline-flex';

      if (data.accountInfo) {
        if (connectedAccountName) connectedAccountName.textContent = data.accountInfo.name || `Account #${activeSlot}`;
        if (connectedAccountPhone) connectedAccountPhone.textContent = data.accountInfo.formattedPhone || data.accountInfo.phoneNumber || '';
        if (connectedAccountTime && data.accountInfo.connectedAt) {
          connectedAccountTime.textContent = new Date(data.accountInfo.connectedAt).toLocaleTimeString();
        }
      }
      if (connectedSlotLabel) {
        connectedSlotLabel.textContent = `Slot #${activeSlot} (${activeSessionId})`;
      }
    } else {
      if (connectedCard) connectedCard.style.display = 'none';
      if (qrCard) qrCard.style.display = 'flex';
      if (btnConnect) btnConnect.style.display = 'inline-flex';
      if (btnDisconnect) btnDisconnect.style.display = 'none';

      if (data.qrDataUrl) {
        displayQR(data.qrDataUrl, data.qrExpirySeconds || 45);
      } else {
        if (qrImage) qrImage.style.display = 'none';
        if (qrPlaceholder) qrPlaceholder.style.display = 'flex';
      }
    }
  }

  function updateSlotCardInGrid(slotData) {
    const dot = document.getElementById(`dot-${slotData.sessionId}`);
    const phone = document.getElementById(`phone-${slotData.sessionId}`);
    const status = document.getElementById(`status-${slotData.sessionId}`);

    if (dot) dot.className = `status-dot ${slotData.status}`;
    if (status) status.textContent = slotData.status;
    if (phone) {
      phone.textContent = slotData.accountInfo ? (slotData.accountInfo.formattedPhone || slotData.accountInfo.name) : 'Ready to Link';
      phone.style.color = slotData.connected ? 'var(--text-accent)' : 'var(--text-muted)';
    }

    // Refresh count
    fetch('/api/whatsapp/accounts')
      .then(res => res.json())
      .then(data => {
        if (data.success && connectedCountPill) {
          connectedCountPill.textContent = `${data.connectedCount} / ${data.maxAccounts} Connected`;
        }
      })
      .catch(() => {});
  }

  // Switch Slot function
  window.switchAccountSlot = async (sessionId, slot) => {
    activeSessionId = sessionId;
    activeSlot = slot;

    // Update active highlight in UI grid
    document.querySelectorAll('.slot-card').forEach(card => {
      const cardSlot = card.getAttribute('data-session-id');
      if (cardSlot === sessionId) {
        card.style.background = 'rgba(16, 185, 129, 0.12)';
        card.style.borderColor = 'var(--primary)';
        card.classList.add('active');
      } else {
        card.style.background = 'var(--bg-input)';
        card.style.borderColor = 'var(--border-color)';
        card.classList.remove('active');
      }
    });

    // Fetch this slot's status
    try {
      const res = await fetch(`/api/whatsapp/status?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.success) {
        renderActiveSlotStatus(data.data);
      }
    } catch (err) {
      console.error('Error switching slot:', err);
    }
  };

  // Socket Events
  if (window.appSocket) {
    window.appSocket.on('whatsapp:qr', (data) => {
      if (data.sessionId === activeSessionId) {
        displayQR(data.qrDataUrl, data.qrExpirySeconds || 45);
      }
      updateSlotCardInGrid(data);
    });

    window.appSocket.on('whatsapp:connected', (data) => {
      if (data.sessionId === activeSessionId) {
        renderActiveSlotStatus(data);
      }
      updateSlotCardInGrid(data);
      if (window.showToast) {
        window.showToast(`[${data.label || 'Account'}] Connected: ${data.accountInfo?.name || data.accountInfo?.formattedPhone || ''}`, 'success');
      }
    });

    window.appSocket.on('whatsapp:disconnected', (data) => {
      if (data.sessionId === activeSessionId) {
        renderActiveSlotStatus({ status: 'disconnected', label: data.label });
      }
      updateSlotCardInGrid(data);
      if (window.showToast) {
        window.showToast(`[${data.label || 'Account'}] Disconnected: ${data.reason || 'Session ended'}`, 'warn');
      }
    });

    window.appSocket.on('whatsapp:account_update', (data) => {
      updateSlotCardInGrid(data);
      if (data.sessionId === activeSessionId) {
        renderActiveSlotStatus(data);
      }
    });
  }

  // Connect Button Handler
  if (btnConnect) {
    btnConnect.addEventListener('click', async () => {
      try {
        btnConnect.disabled = true;
        btnConnect.innerHTML = `<span class="qr-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Generating QR...`;

        const res = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionId })
        });
        const data = await res.json();

        if (data.success) {
          if (window.showToast) window.showToast(`Initializing connection for Account ${activeSlot}...`, 'info');
        } else {
          if (window.showToast) window.showToast(data.error || 'Failed to initialize connection', 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
      } finally {
        btnConnect.disabled = false;
        btnConnect.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg> Initialize Connection`;
      }
    });
  }

  // Refresh QR Button Handler
  if (btnRefreshQr) {
    btnRefreshQr.addEventListener('click', async () => {
      try {
        btnRefreshQr.disabled = true;
        const res = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionId })
        });
        const data = await res.json();
        if (window.showToast) window.showToast(`Refreshing QR Code for Account ${activeSlot}...`, 'info');
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      } finally {
        setTimeout(() => { btnRefreshQr.disabled = false; }, 3000);
      }
    });
  }

  // Disconnect Button Handler
  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', async () => {
      if (!confirm(`Are you sure you want to disconnect and logout Account #${activeSlot}?`)) {
        return;
      }
      try {
        btnDisconnect.disabled = true;
        btnDisconnect.textContent = 'Disconnecting...';

        const res = await fetch('/api/whatsapp/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSessionId, logout: true })
        });
        const data = await res.json();
        if (data.success) {
          if (window.showToast) window.showToast(`Account #${activeSlot} disconnected successfully.`, 'success');
          renderActiveSlotStatus({ status: 'disconnected', label: `Account ${activeSlot}` });
        } else {
          if (window.showToast) window.showToast(data.error || 'Failed to disconnect', 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
      } finally {
        btnDisconnect.disabled = false;
        btnDisconnect.textContent = 'Disconnect This Account';
      }
    });
  }
});
