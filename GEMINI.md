# Project Rules & Architecture Directives

## 1. Zero Browser Native Alerts / Dialogs (Strict Requirement)
- **NEVER** use browser-native dialogs: `window.alert()`, `window.confirm()`, or `window.prompt()`.
- Browser-native alert/confirm popups look unprofessional and break the premium glassmorphism UX.
- **Always** use custom code components:
  - For notifications & feedback: `window.showToast(message, 'success' | 'error' | 'info' | 'warn')`
  - For user confirmations: `await window.showConfirmDialog({ title, message, confirmText, cancelText, type })`
  - For custom single-button notices: `await window.showAlertDialog({ title, message, buttonText, type })`
- If new actions requiring user confirmation are added anywhere in the platform, they **MUST** be implemented using `window.showConfirmDialog` or custom HTML/CSS modal code.

## 2. English-Only Web Interface
- The entire web UI (labels, buttons, titles, instructions, cards, modals, placeholders, toasts, error messages) **must be in English only**.
- No Bengali text may appear in HTML templates or client scripts (except within sent/received WhatsApp message content where Unicode/Bengali messaging is fully supported).

## 3. Technology Stack & Framework Boundaries
- Backend: Node.js, Express.js, Baileys (`@whiskeysockets/baileys`), MongoDB (Mongoose), Socket.IO.
- Frontend: Server-side rendered EJS templates + Vanilla JS (`public/js/`) + Vanilla CSS (`public/css/`).
- **NO** React, Next.js, Vue, Angular, or frontend build toolchains.

## 4. Multi-Account Capabilities
- Exactly 5 accounts maximum (`account_1` through `account_5`).
- Independent sandboxed Multi-Device sockets for each slot.
- Safe Pairing: Temporary pairing attempts that are closed or cancelled are never saved as ghost slots.
- Every account (including Slot 1) can be removed or reconnected at any time.

## 5. Security & Ports
- Custom port: Configured in `.env` (`PORT=4000`).
- PIN Authentication: 6-digit security PIN (`APP_PIN=123456` in `.env`).
- Session Guard: Refreshing keeps the session unlocked; closing the tab/window clears session storage and requires PIN re-entry.
