/**
 * Send Message Page Client Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('send-message-form');
  const recipientInput = document.getElementById('recipient-input');
  const recipientHint = document.getElementById('recipient-hint');
  const messageTypeTabs = document.querySelectorAll('.type-tab');
  const currentTypeInput = document.getElementById('message-type-input');
  const textGroup = document.getElementById('text-group');
  const mediaGroup = document.getElementById('media-group');
  const documentGroup = document.getElementById('document-group');
  const contentInput = document.getElementById('content-input');
  const fileInput = document.getElementById('file-input');
  const dropzone = document.getElementById('dropzone');
  const filePreview = document.getElementById('file-preview');
  const fileThumb = document.getElementById('file-thumb');
  const fileNameDisplay = document.getElementById('file-name-display');
  const fileSizeDisplay = document.getElementById('file-size-display');
  const btnRemoveFile = document.getElementById('btn-remove-file');
  const customFileNameInput = document.getElementById('custom-filename-input');
  const charCounter = document.getElementById('char-counter');
  const btnSubmit = document.getElementById('btn-submit');
  const bengaliSnippetBtns = document.querySelectorAll('.snippet-btn');
  const notConnectedAlert = document.getElementById('not-connected-alert');

  let selectedType = 'text';
  let selectedFile = null;

  // Bengali snippet click
  bengaliSnippetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const textToAppend = btn.getAttribute('data-text');
      if (contentInput) {
        contentInput.value = contentInput.value ? `${contentInput.value}\n${textToAppend}` : textToAppend;
        updateCharCount();
        contentInput.focus();
      }
    });
  });

  // Switch Message Type Tabs
  messageTypeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      messageTypeTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      selectedType = tab.getAttribute('data-type');
      if (currentTypeInput) currentTypeInput.value = selectedType;

      updateFieldVisibility();
    });
  });

  function updateFieldVisibility() {
    // Reset file accept filter according to type
    if (selectedType === 'text') {
      if (textGroup) textGroup.style.display = 'block';
      if (mediaGroup) mediaGroup.style.display = 'none';
      if (documentGroup) documentGroup.style.display = 'none';
      if (fileInput) fileInput.value = '';
      clearFilePreview();
      const label = document.getElementById('content-label');
      if (label) label.textContent = 'Message Content';
    } else if (selectedType === 'image') {
      if (textGroup) textGroup.style.display = 'block';
      if (mediaGroup) mediaGroup.style.display = 'block';
      if (documentGroup) documentGroup.style.display = 'none';
      if (fileInput) fileInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
      const label = document.getElementById('content-label');
      if (label) label.textContent = 'Caption (Optional)';
      const dropzoneText = document.getElementById('dropzone-text');
      if (dropzoneText) dropzoneText.textContent = 'Click or drag JPG, PNG, or WebP image here';
    } else if (selectedType === 'video') {
      if (textGroup) textGroup.style.display = 'block';
      if (mediaGroup) mediaGroup.style.display = 'block';
      if (documentGroup) documentGroup.style.display = 'none';
      if (fileInput) fileInput.accept = 'video/mp4,video/3gpp,video/quicktime,video/x-matroska';
      const label = document.getElementById('content-label');
      if (label) label.textContent = 'Caption (Optional)';
      const dropzoneText = document.getElementById('dropzone-text');
      if (dropzoneText) dropzoneText.textContent = 'Click or drag MP4 or 3GP video here';
    } else if (selectedType === 'document') {
      if (textGroup) textGroup.style.display = 'block';
      if (mediaGroup) mediaGroup.style.display = 'block';
      if (documentGroup) documentGroup.style.display = 'block';
      if (fileInput) fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.csv';
      const label = document.getElementById('content-label');
      if (label) label.textContent = 'Caption / Note (Optional)';
      const dropzoneText = document.getElementById('dropzone-text');
      if (dropzoneText) dropzoneText.textContent = 'Click or drag PDF, DOCX, XLSX, or ZIP document here';
    }
  }

  // Character counter
  if (contentInput && charCounter) {
    contentInput.addEventListener('input', updateCharCount);
  }

  function updateCharCount() {
    if (contentInput && charCounter) {
      charCounter.textContent = `${contentInput.value.length} characters`;
    }
  }

  // Recipient input validation
  if (recipientInput) {
    recipientInput.addEventListener('input', () => {
      const raw = recipientInput.value.trim().replace(/[^\d+]/g, '');
      const digits = raw.replace(/\D/g, '');

      if (!digits) {
        recipientHint.textContent = 'Enter recipient phone with country code (e.g. 8801712345678 or +1234567890)';
        recipientHint.style.color = 'var(--text-muted)';
        return;
      }

      if (digits.length < 7 || digits.length > 15) {
        recipientHint.textContent = `⚠️ Current length: ${digits.length} digits. Standard international format requires 7-15 digits.`;
        recipientHint.style.color = 'var(--warning)';
      } else {
        let flag = '🌐';
        let country = 'International';
        if (digits.startsWith('880')) { flag = '🇧🇩'; country = 'Bangladesh'; }
        else if (digits.startsWith('91')) { flag = '🇮🇳'; country = 'India'; }
        else if (digits.startsWith('1')) { flag = '🇺🇸'; country = 'US/Canada'; }
        else if (digits.startsWith('44')) { flag = '🇬🇧'; country = 'UK'; }
        else if (digits.startsWith('971')) { flag = '🇦🇪'; country = 'UAE'; }
        else if (digits.startsWith('966')) { flag = '🇸🇦'; country = 'Saudi Arabia'; }

        recipientHint.textContent = `Valid recipient: ${flag} ${country} (+${digits})`;
        recipientHint.style.color = 'var(--text-accent)';
      }
    });
  }

  // Drag and Drop & File Upload handling
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  function handleFileSelection(file) {
    const maxMb = 50;
    if (file.size > maxMb * 1024 * 1024) {
      if (window.showToast) window.showToast(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum ${maxMb}MB limit.`, 'error');
      clearFilePreview();
      return;
    }

    selectedFile = file;
    if (dropzone) dropzone.style.display = 'none';
    if (filePreview) filePreview.style.display = 'flex';
    if (fileNameDisplay) fileNameDisplay.textContent = file.name;
    if (fileSizeDisplay) fileSizeDisplay.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

    // Preview thumbnail if image
    if (file.type.startsWith('image/') && fileThumb) {
      fileThumb.style.display = 'block';
      const reader = new FileReader();
      reader.onload = (e) => { fileThumb.src = e.target.result; };
      reader.readAsDataURL(file);
    } else if (fileThumb) {
      fileThumb.style.display = 'none';
    }

    // Default custom filename to original name if empty
    if (customFileNameInput && !customFileNameInput.value) {
      customFileNameInput.value = file.name;
    }
  }

  function clearFilePreview() {
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (dropzone) dropzone.style.display = 'block';
    if (filePreview) filePreview.style.display = 'none';
    if (fileThumb) fileThumb.src = '';
  }

  if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', (e) => {
      e.stopPropagation();
      clearFilePreview();
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const recipient = recipientInput.value.trim();
      const content = contentInput ? contentInput.value.trim() : '';
      const customFileName = customFileNameInput ? customFileNameInput.value.trim() : '';

      // Validation
      if (!recipient) {
        if (window.showToast) window.showToast('Please specify a recipient phone number.', 'error');
        recipientInput.focus();
        return;
      }

      if (selectedType === 'text' && !content) {
        if (window.showToast) window.showToast('Please type a message before sending.', 'error');
        contentInput.focus();
        return;
      }

      if (['image', 'video', 'document'].includes(selectedType) && !selectedFile) {
        if (window.showToast) window.showToast(`Please attach a ${selectedType} file.`, 'error');
        return;
      }

      // Prevent duplicate submission: disable button & generate idempotency key
      const idempotencyKey = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      btnSubmit.disabled = true;
      const originalBtnHtml = btnSubmit.innerHTML;
      btnSubmit.innerHTML = `<span class="qr-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Sending...`;

      try {
        const formData = new FormData();
        formData.append('recipient', recipient);
        formData.append('messageType', selectedType);
        formData.append('content', content);
        formData.append('idempotencyKey', idempotencyKey);

        const senderAccountSelect = document.getElementById('sender-account-select');
        if (senderAccountSelect && senderAccountSelect.value) {
          formData.append('senderAccount', senderAccountSelect.value);
        }

        if (selectedFile) {
          formData.append('media', selectedFile);
        }

        if (customFileName) {
          formData.append('customFileName', customFileName);
        }

        const response = await fetch('/api/messages/send', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          if (window.showToast) {
            window.showToast(`Message sent successfully to ${recipient}!`, 'success');
          }
          // Reset form fields
          if (contentInput) contentInput.value = '';
          updateCharCount();
          clearFilePreview();
          if (customFileNameInput) customFileNameInput.value = '';
        } else {
          if (window.showToast) {
            window.showToast(result.error || 'Failed to send message.', 'error');
          }
        }
      } catch (err) {
        if (window.showToast) {
          window.showToast(`Network or dispatch error: ${err.message}`, 'error');
        }
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnHtml;
      }
    });
  }

  // Connection check warning banner
  window.addEventListener('whatsapp:statusChanged', (e) => {
    const isConnected = e.detail && e.detail.status === 'connected';
    if (notConnectedAlert) {
      notConnectedAlert.style.display = isConnected ? 'none' : 'flex';
    }
    if (btnSubmit) {
      btnSubmit.disabled = !isConnected;
    }
  });

  // Initial tab setup
  updateFieldVisibility();
});
