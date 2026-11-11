const passwordInput = document.getElementById('boothPassword');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');

if (togglePassword && passwordInput && eyeIcon) {
  togglePassword.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    togglePassword.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    togglePassword.title = isHidden ? 'Hide password' : 'Show password';
    eyeIcon.innerHTML = isHidden
      ? '<path d="M3 2 2 3l4 4C3.5 8.6 1.9 10.5 1.5 11.1a1.5 1.5 0 0 0 0 1.8C2.6 14.5 6.8 19 12 19c1.7 0 3.3-.5 4.7-1.2l3.3 3.3 1-1L3 2Zm9 14.2a4.2 4.2 0 0 1-4.2-4.2c0-.7.2-1.4.5-2l5.7 5.7c-.6.3-1.3.5-2 .5ZM12 5c-1.3 0-2.6.3-3.8.8l2 2A4.2 4.2 0 0 1 16.2 14l2.2 2.2c2.1-1.4 3.6-3.1 4.1-3.9a1.5 1.5 0 0 0 0-1.8C21.4 9.5 17.2 5 12 5Zm0 11.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Zm0-2.3a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z"></path>'
      : '<path d="M12 5c-5.2 0-9.4 4.5-10.5 6.1a1.5 1.5 0 0 0 0 1.8C2.6 14.5 6.8 19 12 19s9.4-4.5 10.5-6.1a1.5 1.5 0 0 0 0-1.8C21.4 9.5 17.2 5 12 5Zm0 11.2a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Zm0-2.3a1.9 1.9 0 1 0 0-3.8 1.9 1.9 0 0 0 0 3.8Z"></path>';
  });
}

// Booth login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    const user = document.getElementById('boothUsername')?.value.trim();
    const pass = document.getElementById('boothPassword')?.value.trim();
    if (!user || !pass) {
      event.preventDefault();
      const formMessage = document.getElementById('formMessage');
      if (formMessage) {
        formMessage.textContent = 'Please enter both username and password.';
        formMessage.style.color = '#ea4335';
      }
      return;
    }

    // Wipe any lingering session tokens from previous booth before logging into new booth
    try {
      sessionStorage.removeItem('devfest_sid');
      localStorage.removeItem('devfest_sid');
    } catch (e) {}
  });
}

// Error handling: Prevent Backspace key from triggering browser back navigation outside editable fields
window.addEventListener('keydown', (event) => {
  if (event.key === 'Backspace' || event.keyCode === 8) {
    const target = event.target;
    const isEditable =
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
      !target.readOnly &&
      !target.disabled;
    if (!isEditable) {
      event.preventDefault();
    }
  }
});