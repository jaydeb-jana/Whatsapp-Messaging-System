/**
 * Dynamic Multi-Account WhatsApp Connection Manager Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const qrCard = document.getElementById('qr-card');
  const connectedCard = document.getElementById('connected-card');
  const disconnectedCard = document.getElementById('disconnected-card');
  const qrImage = document.getElementById('qr-image');
  const qrPlaceholder = document.getElementById('qr-placeholder');
  const qrCountdownEl = document.getElementById('qr-countdown');
  const btnRefreshQr = document.getElementById('btn-refresh-qr');
  const btnDisconnect = document.getElementById('btn-disconnect');
  const connectionStatePill = document.getElementById('connection-state-pill');
  const connectedAccountName = document.getElementById('connected-account-name');
  const connectedAccountPhone = document.getElementById('connected-account-phone');
  const connectedAccountTime = document.getElementById('connected-account-time');
  const connectedSlotLabel = document.getElementById('connected-slot-label');
  const activeSlotName = document.getElementById('active-slot-name');
  const disconnSlotTitle = document.getElementById('disconn-slot-title');
  const connectedCountPill = document.getElementById('connected-count-pill');
  const btnQuickAdd = document.getElementById('btn-quick-add');
  const cardAddButton = document.getElementById('card-add-button');
  const addCardTitle = document.getElementById('add-card-title');
  const addCardSubtitle = document.getElementById('add-card-subtitle');
  const slotsGrid = document.getElementById('slots-grid');
  const btnRemoveActive = document.getElementById('btn-remove-active');

  let activeSessionId = window.currentSessionId || 'account_1';
  let activeSlot = window.currentSlot || 1;
  const maxAccounts = window.maxAccounts || 5;
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

    // Show QR card, hide other cards
    if (qrCard) qrCard.style.display = 'flex';
    if (disconnectedCard) disconnectedCard.style.display = 'none';
    if (connectedCard) connectedCard.style.display = 'none';

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
    if (disconnSlotTitle) {
      disconnSlotTitle.textContent = data.label || `Account ${activeSlot}`;
    }
    if (btnRemoveActive) {
      btnRemoveActive.style.display = activeSlot > 1 ? 'inline-flex' : 'none';
    }

    if (status === 'connected') {
      if (disconnectedCard) disconnectedCard.style.display = 'none';
      if (qrCard) qrCard.style.display = 'none';
      if (connectedCard) connectedCard.style.display = 'flex';

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
    } else if (status === 'connecting' || !!data.qrDataUrl) {
      if (disconnectedCard) disconnectedCard.style.display = 'none';
      if (connectedCard) connectedCard.style.display = 'none';
      if (qrCard) qrCard.style.display = 'flex';

      if (data.qrDataUrl) {
        displayQR(data.qrDataUrl, data.qrExpirySeconds || 45);
      } else {
        if (qrImage) qrImage.style.display = 'none';
        if (qrPlaceholder) qrPlaceholder.style.display = 'flex';
      }
    } else {
      // Disconnected state
      if (connectedCard) connectedCard.style.display = 'none';
      if (qrCard) qrCard.style.display = 'none';
      if (disconnectedCard) disconnectedCard.style.display = 'flex';
    }
  }

  function updateSlotCardInGrid(slotData) {
    const card = document.getElementById(`card-${slotData.sessionId}`);
    const dot = document.getElementById(`dot-${slotData.sessionId}`);
    const phone = document.getElementById(`phone-${slotData.sessionId}`);
    const status = document.getElementById(`status-${slotData.sessionId}`);
    let reconnBtn = document.getElementById(`reconn-btn-${slotData.sessionId}`);

    if (card) {
      if (slotData.status === 'disconnected') {
        card.classList.add('disconnected');
      } else {
        card.classList.remove('disconnected');
      }
    }

    if (dot) dot.className = `status-dot ${slotData.status}`;
    if (status) status.textContent = slotData.status;

    if (phone) {
      if (slotData.connected) {
        phone.textContent = slotData.accountInfo ? (slotData.accountInfo.formattedPhone || slotData.accountInfo.name) : 'Connected';
        phone.style.color = 'var(--text-accent)';
      } else if (slotData.status === 'disconnected') {
        phone.textContent = 'Disconnected';
        phone.style.color = '#f87171';
      } else {
        phone.textContent = 'Connecting...';
        phone.style.color = 'var(--text-muted)';
      }
    }

    // Toggle inline Reconnect button on the slot card
    if (slotData.status === 'disconnected') {
      if (!reconnBtn && status && status.parentElement) {
        reconnBtn = document.createElement('button');
        reconnBtn.type = 'button';
        reconnBtn.className = 'slot-reconnect-btn';
        reconnBtn.id = `reconn-btn-${slotData.sessionId}`;
        reconnBtn.innerHTML = '⚡ Reconnect';
        reconnBtn.onclick = (e) => {
          e.stopPropagation();
          window.triggerReconnect(slotData.sessionId, slotData.slot);
        };
        status.parentElement.appendChild(reconnBtn);
      }
    } else if (reconnBtn) {
      reconnBtn.remove();
    }

    // Refresh totals count
    refreshAccountsSummary();
  }

  function refreshAccountsSummary() {
    fetch('/api/whatsapp/accounts')
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;

        if (connectedCountPill) {
          connectedCountPill.textContent = `${data.connectedCount} / ${data.maxAccounts} Online`;
        }

        const addedCount = data.addedAccounts ? data.addedAccounts.length : (data.accounts ? data.accounts.filter(a => a.isAdded).length : 1);
        const isMax = addedCount >= maxAccounts;

        if (btnQuickAdd) {
          btnQuickAdd.disabled = isMax;
          btnQuickAdd.style.opacity = isMax ? '0.45' : '1';
        }

        if (cardAddButton) {
          if (isMax) {
            cardAddButton.classList.add('disabled');
          } else {
            cardAddButton.classList.remove('disabled');
          }
        }
        if (addCardTitle) {
          addCardTitle.textContent = isMax ? 'Max Slots Reached' : '+ Add Account';
        }
        if (addCardSubtitle) {
          addCardSubtitle.textContent = isMax ? '5 of 5 accounts in use' : `Link another number (${addedCount}/${maxAccounts})`;
        }
      })
      .catch(() => {});
  }

  // Switch Active Slot function
  window.switchAccountSlot = async (sessionId, slot) => {
    activeSessionId = sessionId;
    activeSlot = slot;

    // Highlight selected card
    document.querySelectorAll('.slot-card').forEach(card => {
      const cardId = card.getAttribute('data-session-id');
      if (cardId === sessionId) {
        card.classList.add('active');
      } else {
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

  // Reconnect active account action
  window.reconnectActiveAccount = async () => {
    try {
      if (disconnectedCard) disconnectedCard.style.display = 'none';
      if (connectedCard) connectedCard.style.display = 'none';
      if (qrCard) qrCard.style.display = 'flex';
      if (qrPlaceholder) {
        qrPlaceholder.style.display = 'flex';
        qrPlaceholder.innerHTML = `<div class="qr-spinner"></div><span>Generating QR Code...</span><span style="font-size:0.75rem;color:#64748b;">Requesting new pairing session for Account #${activeSlot}</span>`;
      }
      if (qrImage) qrImage.style.display = 'none';

      if (window.showToast) window.showToast(`Initializing QR code for Account #${activeSlot}...`, 'info');

      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId })
      });
      const data = await res.json();

      if (!data.success) {
        if (window.showToast) window.showToast(data.error || 'Failed to initialize reconnection', 'error');
        renderActiveSlotStatus({ status: 'disconnected', label: `Account ${activeSlot}` });
      }
    } catch (err) {
      if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
      renderActiveSlotStatus({ status: 'disconnected', label: `Account ${activeSlot}` });
    }
  };

  // Trigger Reconnect directly from slot card
  window.triggerReconnect = async (sessionId, slot) => {
    await window.switchAccountSlot(sessionId, slot);
    window.reconnectActiveAccount();
  };

  // Cancel connecting
  window.cancelConnecting = () => {
    renderActiveSlotStatus({ status: 'disconnected', label: `Account ${activeSlot}` });
  };

  // Add New Account Slot via Plus (+) button
  window.addNewAccountSlot = async () => {
    try {
      if (cardAddButton && cardAddButton.classList.contains('disabled')) {
        if (window.showToast) window.showToast('Maximum 5 WhatsApp accounts already added.', 'warn');
        return;
      }

      if (window.showToast) window.showToast('Creating new account slot...', 'info');

      const res = await fetch('/api/whatsapp/accounts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!data.success) {
        if (window.showToast) window.showToast(data.error || 'Could not add account', 'error');
        return;
      }

      const newAccount = data.account;
      if (window.showToast) window.showToast(`Slot #${newAccount.slot} created! Scan QR code to connect.`, 'success');

      // Refresh page or switch to new slot and start QR
      window.location.href = `/whatsapp/connect?slot=${newAccount.sessionId}`;
    } catch (err) {
      if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Remove Account Slot
  window.removeAccountSlot = async (sessionId, slot) => {
    if (!confirm(`Are you sure you want to remove Account #${slot}? Any active connection will be disconnected.`)) {
      return;
    }

    try {
      const res = await fetch('/api/whatsapp/accounts/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();

      if (data.success) {
        if (window.showToast) window.showToast(`Account #${slot} removed successfully.`, 'info');
        window.location.href = '/whatsapp/connect';
      } else {
        if (window.showToast) window.showToast(data.error || 'Failed to remove account', 'error');
      }
    } catch (err) {
      if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
    }
  };

  window.removeActiveAccount = () => {
    if (activeSlot > 1) {
      window.removeAccountSlot(activeSessionId, activeSlot);
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
      updateSlotCardInGrid({ ...data, status: 'disconnected' });
      if (window.showToast) {
        window.showToast(`[${data.label || 'Account'}] Disconnected: ${data.reason || 'Offline'}`, 'warn');
      }
    });

    window.appSocket.on('whatsapp:account_update', (data) => {
      updateSlotCardInGrid(data);
      if (data.sessionId === activeSessionId) {
        renderActiveSlotStatus(data);
      }
    });

    window.appSocket.on('whatsapp:account_added', () => {
      refreshAccountsSummary();
    });

    window.appSocket.on('whatsapp:account_removed', () => {
      refreshAccountsSummary();
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
        if (window.showToast) window.showToast(`Refreshing QR Code for Account #${activeSlot}...`, 'info');
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
          if (window.showToast) window.showToast(`Account #${activeSlot} disconnected.`, 'success');
          renderActiveSlotStatus({ status: 'disconnected', label: `Account ${activeSlot}` });
        } else {
          if (window.showToast) window.showToast(data.error || 'Failed to disconnect', 'error');
        }
      } catch (err) {
        if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
      } finally {
        btnDisconnect.disabled = false;
        btnDisconnect.textContent = 'Disconnect Account';
      }
    });
  }
});
