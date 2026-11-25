# Agent Guidelines & Strict Rules

## Mandatory Rules for All AI Agents

### 1. NO Browser Native Alerts (`alert()`, `confirm()`, `prompt()`)
Under no circumstances should `window.alert()`, `window.confirm()`, or `window.prompt()` be introduced.
All user notifications and confirmation interactions must use:
- `window.showToast(message, type)` for toasts.
- `window.showConfirmDialog({ title, message, confirmText, cancelText, type })` for async confirmations.
- `window.showAlertDialog({ title, message, buttonText, type })` for alert dialogs.

### 2. Strict English UI
All user-facing interface text in views, templates, CSS, and JS must be written in professional English.

### 3. Server Architecture
- Multi-Account WhatsApp (5 slots max) with Baileys v7.
- Embedded MongoDB or MongoDB URI.
- Port 4000.
