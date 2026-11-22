/**
 * Global Socket.IO Client for Real-Time WhatsApp Events
 */

(function () {
  if (typeof io === 'undefined') {
    console.warn('Socket.io library not loaded.');
    return;
  }

  const socket = io();
  window.appSocket = socket;

  // Cache UI Elements for Global Status
  const statusDots = document.querySelectorAll('.status-dot');
  const statusTexts = document.querySelectorAll('.status-text');
  const accountPills = document.querySelectorAll('.account-pill');
  const accountNames = document.querySelectorAll('.account-name');

  function updateStatusUI(data) {
    const status = data.status || 'disconnected';

    // Update Dots
    statusDots.forEach((dot) => {
      dot.className = `status-dot ${status}`;
    });

    // Update Text labels
    statusTexts.forEach((el) => {
      el.textContent = status;
    });

    // Update Account Info
    if (status === 'connected' && data.accountInfo) {
      accountPills.forEach((pill) => (pill.style.display = 'flex'));
      accountNames.forEach((el) => {
        el.textContent = data.accountInfo.name || data.accountInfo.formattedPhone || 'WhatsApp User';
      });
    } else {
      accountPills.forEach((pill) => {
        if (!pill.classList.contains('always-visible')) {
          pill.style.display = 'none';
        }
      });
    }

    // Dispatch custom DOM event for page scripts
    window.dispatchEvent(new CustomEvent('whatsapp:statusChanged', { detail: data }));
  }

  socket.on('connect', () => {
    console.log('[Socket] Connected to server.');
    socket.emit('request:status');
  });

  socket.on('whatsapp:status', (data) => {
    updateStatusUI(data);
  });

  socket.on('whatsapp:connected', (data) => {
    updateStatusUI({ status: 'connected', accountInfo: data.accountInfo });
    if (window.showToast) {
      window.showToast(`WhatsApp Connected: ${data.accountInfo?.name || data.accountInfo?.formattedPhone || 'User'}`, 'success');
    }
  });

  socket.on('whatsapp:disconnected', (data) => {
    updateStatusUI({ status: 'disconnected' });
    if (window.showToast) {
      window.showToast(`WhatsApp Disconnected: ${data.reason || 'Session ended'}`, 'warn');
    }
  });

  socket.on('whatsapp:reconnecting', (data) => {
    updateStatusUI({ status: 'reconnecting' });
    if (window.showToast && data.attempt === 1) {
      window.showToast('Reconnecting to WhatsApp...', 'info');
    }
  });

  socket.on('message:sending', (data) => {
    if (window.showToast) {
      window.showToast(`Dispatching ${data.messageType} message to ${data.recipient}...`, 'info', 2500);
    }
  });

  socket.on('message:sent', (data) => {
    if (window.showToast) {
      window.showToast(`Message sent successfully to ${data.recipient}!`, 'success', 4000);
    }
    // Ask server for fresh stats
    socket.emit('request:stats');
    window.dispatchEvent(new CustomEvent('message:sent', { detail: data }));
  });

  socket.on('message:failed', (data) => {
    if (window.showToast) {
      window.showToast(`Delivery failed to ${data.recipient}: ${data.error}`, 'error', 6000);
    }
    socket.emit('request:stats');
    window.dispatchEvent(new CustomEvent('message:failed', { detail: data }));
  });
})();
