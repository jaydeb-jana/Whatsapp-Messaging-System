/**
 * Dynamic Multi-Account WhatsApp Connection Manager Client Script
 * With Luxury Glassmorphic QR Pairing Modal & Safe Conditional Persistence
 */

document.addEventListener('DOMContentLoaded', () => {
  // Modal Elements
  const modalOverlay = document.getElementById('qr-modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalSlotNum = document.getElementById('modal-slot-num');
  const modalQrView = document.getElementById('modal-qr-view');
  const modalSuccessView = document.getElementById('modal-success-view');
  const modalSuccessPhone = document.getElementById('modal-success-phone');
  const modalQrImg = document.getElementById('modal-qr-img');
  const modalQrPlaceholder = document.getElementById('modal-qr-placeholder');
  const modalQrTimer = document.getElementById('modal-qr-timer');
  const btnModalRefresh = document.getElementById('btn-modal-refresh');

  // Workspace Page Cards
  const connectedCard = document.getElementById('connected-card');
  const disconnectedCard = document.getElementById('disconnected-card');
  const connectedAccountName = document.getElementById('connected-account-name');
  const connectedAccountPhone = document.getElementById('connected-account-phone');
  const connectedAccountTime = document.getElementById('connected-account-time');
  const connectedSlotLabel = document.getElementById('connected-slot-label');
  const disconnSlotTitle = document.getElementById('disconn-slot-title');
  const btnRemoveActive = document.getElementById('btn-remove-active');
  const connectedCountPill = document.getElementById('connected-count-pill');
  const btnQuickAdd = document.getElementById('btn-quick-add');
  const cardAddButton = document.getElementById('card-add-button');
  const addCardTitle = document.getElementById('add-card-title');
  const addCardSubtitle = document.getElementById('add-card-subtitle');
  const btnDisconnect = document.getElementById('btn-disconnect');

  let activeSessionId = window.currentSessionId || 'account_1';
  let activeSlot = window.currentSlot || 1;
  const maxAccounts = window.maxAccounts || 5;

  let pendingPairingSessionId = null;
  let pendingPairingSlot = null;
  let isReconnectMode = false;
  let pairingCompleted = false;
  let modalCountdownInterval = null;
  let remainingSeconds = 45;

  function startModalCountdown(seconds = 45) {
    if (modalCountdownInterval) clearInterval(modalCountdownInterval);
    remainingSeconds = seconds;
    if (modalQrTimer) modalQrTimer.textContent = `${remainingSeconds}s`;

    modalCountdownInterval = setInterval(() => {
      remainingSeconds -= 1;
      if (modalQrTimer) {
        modalQrTimer.textContent = `${remainingSeconds}s`;
      }
      if (remainingSeconds <= 0) {
        clearInterval(modalCountdownInterval);
        if (modalQrTimer) modalQrTimer.textContent = 'Expired. Refreshing...';
      }
    }, 1000);
  }

  function displayModalQR(dataUrl, expirySeconds = 45) {
    if (!modalQrImg) return;
    modalQrImg.src = dataUrl;
    modalQrImg.style.display = 'block';
    if (modalQrPlaceholder) modalQrPlaceholder.style.display = 'none';
    startModalCountdown(expirySeconds);
  }

  // Open Pairing Modal (Used for + Add Account)
  window.openPairingModal = async () => {
    try {
      if (cardAddButton && cardAddButton.classList.contains('disabled')) {
        if (window.showToast) window.showToast('Maximum 5 WhatsApp accounts already in use.', 'warn');
        return;
      }

      if (window.showToast) window.showToast('Starting pairing session...', 'info');

      const res = await fetch('/api/whatsapp/accounts/start-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (!data.success) {
        if (window.showToast) window.showToast(data.error || 'Failed to start pairing', 'error');
        return;
      }

      pendingPairingSessionId = data.sessionId;
      pendingPairingSlot = data.slot;
      isReconnectMode = false;
      pairingCompleted = false;

      // Reset Modal Views
      if (modalTitle) modalTitle.textContent = 'Link New WhatsApp Account';
      if (modalSubtitle) modalSubtitle.textContent = `Scan QR code to pair your device (Channel ${data.slot} of ${maxAccounts})`;
      if (modalSlotNum) modalSlotNum.textContent = data.slot;

      if (modalSuccessView) modalSuccessView.style.display = 'none';
      if (modalQrView) modalQrView.style.display = 'block';
      if (modalQrImg) modalQrImg.style.display = 'none';
      if (modalQrPlaceholder) {
        modalQrPlaceholder.style.display = 'flex';
        modalQrPlaceholder.innerHTML = `<div class="qr-spinner"></div><span>Generating QR Code...</span><span style="font-size:0.74rem;color:#64748b;font-weight:400;">Handshaking with WhatsApp servers</span>`;
      }

      if (modalOverlay) modalOverlay.style.display = 'flex';
    } catch (err) {
      if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Open Reconnect Modal (Used for ⚡ Reconnect on existing accounts)
  window.openReconnectModal = async (sessionId, slot) => {
    try {
      pendingPairingSessionId = sessionId;
      pendingPairingSlot = slot;
      isReconnectMode = true;
      pairingCompleted = false;

      if (modalTitle) modalTitle.textContent = `Reconnect Account #${slot}`;
      if (modalSubtitle) modalSubtitle.textContent = `Scan QR code with your mobile app to restore this session`;
      if (modalSlotNum) modalSlotNum.textContent = slot;

      if (modalSuccessView) modalSuccessView.style.display = 'none';
      if (modalQrView) modalQrView.style.display = 'block';
      if (modalQrImg) modalQrImg.style.display = 'none';
      if (modalQrPlaceholder) {
        modalQrPlaceholder.style.display = 'flex';
        modalQrPlaceholder.innerHTML = `<div class="qr-spinner"></div><span>Generating Reconnection QR...</span><span style="font-size:0.74rem;color:#64748b;font-weight:400;">Requesting fresh session token</span>`;
      }

      if (modalOverlay) modalOverlay.style.display = 'flex';

      // Call connect to trigger QR
      await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
    } catch (err) {
      if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Close Modal (Cancels pairing if not completed)
  window.closePairingModal = async () => {
    if (modalCountdownInterval) clearInterval(modalCountdownInterval);
    if (modalOverlay) modalOverlay.style.display = 'none';

    // If closed before pairing completed & was a new account, cancel socket
    if (!pairingCompleted && pendingPairingSessionId && !isReconnectMode) {
      try {
        await fetch('/api/whatsapp/pairing/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: pendingPairingSessionId })
        });
      } catch (err) {
        // silent
      }
    }

    pendingPairingSessionId = null;
    pendingPairingSlot = null;
    isReconnectMode = false;
    pairingCompleted = false;
  };

  // Refresh QR inside Modal
  window.refreshModalQr = async () => {
    if (!pendingPairingSessionId) return;
    try {
      if (btnModalRefresh) btnModalRefresh.disabled = true;
      if (window.showToast) window.showToast('Refreshing QR Code...', 'info');

      await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: pendingPairingSessionId })
      });
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'error');
    } finally {
      setTimeout(() => { if (btnModalRefresh) btnModalRefresh.disabled = false; }, 3000);
    }
  };

  // Render workspace view for active slot
  function renderActiveSlotStatus(data) {
    const status = data.status || 'disconnected';

    if (disconnSlotTitle) {
      disconnSlotTitle.textContent = data.label || `Account ${activeSlot}`;
    }
    if (btnRemoveActive) {
      btnRemoveActive.style.display = activeSlot > 1 ? 'inline-flex' : 'none';
    }

    if (status === 'connected') {
      if (disconnectedCard) disconnectedCard.style.display = 'none';
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
    } else {
      if (connectedCard) connectedCard.style.display = 'none';
      if (disconnectedCard) disconnectedCard.style.display = 'flex';
    }
  }

  // Update card in the top slots grid
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

    // Toggle inline Reconnect button
    if (slotData.status === 'disconnected') {
      if (!reconnBtn && status && status.parentElement) {
        reconnBtn = document.createElement('button');
        reconnBtn.type = 'button';
        reconnBtn.className = 'slot-reconnect-btn';
        reconnBtn.id = `reconn-btn-${slotData.sessionId}`;
        reconnBtn.innerHTML = '⚡ Reconnect';
        reconnBtn.onclick = (e) => {
          e.stopPropagation();
          window.openReconnectModal(slotData.sessionId, slotData.slot);
        };
        status.parentElement.appendChild(reconnBtn);
      }
    } else if (reconnBtn) {
      reconnBtn.remove();
    }

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

        const addedCount = data.addedAccounts ? data.addedAccounts.length : 1;
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

    document.querySelectorAll('.slot-card').forEach(card => {
      const cardId = card.getAttribute('data-session-id');
      if (cardId === sessionId) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

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

  // Remove Account Slot
  window.removeAccountSlot = async (sessionId, slot) => {
    if (!confirm(`Are you sure you want to remove Account #${slot}?`)) {
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

  // Socket.IO Events
  if (window.appSocket) {
    // Live QR reception
    window.appSocket.on('whatsapp:qr', (data) => {
      if (data.sessionId === pendingPairingSessionId) {
        displayModalQR(data.qrDataUrl, data.qrExpirySeconds || 45);
      }
      updateSlotCardInGrid(data);
    });

    // Connection Successful Event
    window.appSocket.on('whatsapp:connected', (data) => {
      // If modal was open for this session, celebrate and refresh!
      if (data.sessionId === pendingPairingSessionId) {
        pairingCompleted = true;
        if (modalCountdownInterval) clearInterval(modalCountdownInterval);

        if (modalQrView) modalQrView.style.display = 'none';
        if (modalSuccessPhone) modalSuccessPhone.textContent = data.accountInfo ? (data.accountInfo.formattedPhone || data.accountInfo.name) : 'WhatsApp Linked';
        if (modalSuccessView) modalSuccessView.style.display = 'block';

        if (window.showToast) {
          window.showToast(`[${data.label || 'Account'}] Paired & Saved Successfully!`, 'success');
        }

        setTimeout(() => {
          window.closePairingModal();
          // Reload page to display new slot card gracefully
          window.location.href = `/whatsapp/connect?slot=${data.sessionId}`;
        }, 1600);
      }

      if (data.sessionId === activeSessionId) {
        renderActiveSlotStatus(data);
      }
      updateSlotCardInGrid(data);
    });

    // Disconnected Event
    window.appSocket.on('whatsapp:disconnected', (data) => {
      if (data.sessionId === activeSessionId) {
        renderActiveSlotStatus({ status: 'disconnected', label: data.label });
      }
      updateSlotCardInGrid({ ...data, status: 'disconnected' });
      if (window.showToast) {
        window.showToast(`[${data.label || 'Account'}] Disconnected: ${data.reason || 'Offline'}`, 'warn');
      }
    });

    // Real-time Account Update
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

  // Disconnect button from workspace view
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
