/**
 * Custom Glassmorphic Dialog & Alert System (Zero Browser Alert / Confirm)
 * Replaces native window.alert and window.confirm with bespoke UI components.
 * STRICT RULE: No browser native alert() or confirm() dialogs are permitted.
 */

(function () {
  // Enforce zero browser native alerts
  window.alert = function (message) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, 'info');
    } else {
      console.info('[Intercepted Native Alert]:', message);
    }
  };

  function getOrCreateDialogContainer() {
    let backdrop = document.getElementById('custom-dialog-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'custom-dialog-backdrop';
      backdrop.className = 'custom-dialog-backdrop';
      backdrop.innerHTML = `
        <div class="custom-dialog-card" id="custom-dialog-card" role="dialog" aria-modal="true">
          <div class="custom-dialog-glow" id="custom-dialog-glow"></div>
          <div class="custom-dialog-header">
            <div class="custom-dialog-icon-wrapper" id="custom-dialog-icon-wrapper">
              <span id="custom-dialog-icon"></span>
            </div>
            <div style="flex: 1;">
              <h3 class="custom-dialog-title" id="custom-dialog-title"></h3>
              <p class="custom-dialog-desc" id="custom-dialog-desc"></p>
            </div>
          </div>
          <div class="custom-dialog-actions" id="custom-dialog-actions">
            <button type="button" class="btn btn-secondary custom-dialog-cancel-btn" id="custom-dialog-btn-cancel">Cancel</button>
            <button type="button" class="btn custom-dialog-confirm-btn" id="custom-dialog-btn-confirm">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  const icons = {
    danger: `<svg width="24" height="24" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>`,
    warning: `<svg width="24" height="24" fill="none" stroke="#f59e0b" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    info: `<svg width="24" height="24" fill="none" stroke="#38bdf8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
    success: `<svg width="24" height="24" fill="none" stroke="#10b981" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`
  };

  /**
   * Show Custom Confirmation Modal (Promise-based)
   * @param {Object} options
   * @param {string} options.title - Dialog Title
   * @param {string} options.message - Explanation text
   * @param {string} [options.confirmText='Confirm'] - Text for positive action
   * @param {string} [options.cancelText='Cancel'] - Text for cancel action
   * @param {'danger'|'warning'|'primary'|'info'} [options.type='primary'] - Visual style
   * @returns {Promise<boolean>}
   */
  window.showConfirmDialog = function (options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Are you sure?',
        message = 'Please confirm this action to proceed.',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        type = 'danger'
      } = options;

      const backdrop = getOrCreateDialogContainer();
      const card = document.getElementById('custom-dialog-card');
      const glow = document.getElementById('custom-dialog-glow');
      const iconWrapper = document.getElementById('custom-dialog-icon-wrapper');
      const iconSpan = document.getElementById('custom-dialog-icon');
      const titleEl = document.getElementById('custom-dialog-title');
      const descEl = document.getElementById('custom-dialog-desc');
      const btnCancel = document.getElementById('custom-dialog-btn-cancel');
      const btnConfirm = document.getElementById('custom-dialog-btn-confirm');

      titleEl.textContent = title;
      descEl.textContent = message;
      btnCancel.textContent = cancelText;
      btnConfirm.textContent = confirmText;
      btnCancel.style.display = 'inline-flex';

      // Set colors & glow
      glow.className = `custom-dialog-glow glow-${type}`;
      iconWrapper.className = `custom-dialog-icon-wrapper icon-${type}`;
      iconSpan.innerHTML = icons[type] || icons.danger;

      if (type === 'danger') {
        btnConfirm.className = 'btn btn-danger custom-dialog-confirm-btn';
      } else if (type === 'warning') {
        btnConfirm.className = 'btn btn-warning custom-dialog-confirm-btn';
      } else {
        btnConfirm.className = 'btn btn-primary custom-dialog-confirm-btn';
      }

      function cleanup(result) {
        document.removeEventListener('keydown', handleKeyDown);
        backdrop.classList.remove('active');
        card.classList.remove('active');
        setTimeout(() => {
          backdrop.style.display = 'none';
          resolve(result);
        }, 200);
      }

      function handleKeyDown(e) {
        if (e.key === 'Escape') {
          cleanup(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanup(true);
        }
      }

      btnConfirm.onclick = () => cleanup(true);
      btnCancel.onclick = () => cleanup(false);
      backdrop.onclick = (e) => {
        if (e.target === backdrop) cleanup(false);
      };

      document.addEventListener('keydown', handleKeyDown);

      backdrop.style.display = 'flex';
      // Trigger reflow for smooth transition
      void backdrop.offsetWidth;
      backdrop.classList.add('active');
      card.classList.add('active');
      btnConfirm.focus();
    });
  };

  /**
   * Show Custom Alert Modal (Single Button)
   */
  window.showAlertDialog = function (options = {}) {
    return new Promise((resolve) => {
      const {
        title = 'Notice',
        message = '',
        buttonText = 'Understood',
        type = 'info'
      } = typeof options === 'string' ? { message: options } : options;

      const backdrop = getOrCreateDialogContainer();
      const card = document.getElementById('custom-dialog-card');
      const glow = document.getElementById('custom-dialog-glow');
      const iconWrapper = document.getElementById('custom-dialog-icon-wrapper');
      const iconSpan = document.getElementById('custom-dialog-icon');
      const titleEl = document.getElementById('custom-dialog-title');
      const descEl = document.getElementById('custom-dialog-desc');
      const btnCancel = document.getElementById('custom-dialog-btn-cancel');
      const btnConfirm = document.getElementById('custom-dialog-btn-confirm');

      titleEl.textContent = title;
      descEl.textContent = message;
      btnConfirm.textContent = buttonText;
      btnCancel.style.display = 'none';

      glow.className = `custom-dialog-glow glow-${type}`;
      iconWrapper.className = `custom-dialog-icon-wrapper icon-${type}`;
      iconSpan.innerHTML = icons[type] || icons.info;
      btnConfirm.className = type === 'danger' ? 'btn btn-danger custom-dialog-confirm-btn' : 'btn btn-primary custom-dialog-confirm-btn';

      function cleanup() {
        document.removeEventListener('keydown', handleKeyDown);
        backdrop.classList.remove('active');
        card.classList.remove('active');
        setTimeout(() => {
          backdrop.style.display = 'none';
          resolve();
        }, 200);
      }

      function handleKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          cleanup();
        }
      }

      btnConfirm.onclick = () => cleanup();
      backdrop.onclick = (e) => {
        if (e.target === backdrop) cleanup();
      };

      document.addEventListener('keydown', handleKeyDown);

      backdrop.style.display = 'flex';
      void backdrop.offsetWidth;
      backdrop.classList.add('active');
      card.classList.add('active');
      btnConfirm.focus();
    });
  };
})();
