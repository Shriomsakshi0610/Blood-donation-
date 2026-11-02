/**
 * BloodConnect — Authentication Controller (Sign In & Sign Up)
 * Integrates directly with Spring Boot AuthController endpoints:
 * - POST /api/auth/signin
 * - POST /api/auth/signup
 */

document.addEventListener('DOMContentLoaded', () => {
  initLoginForm();
  initSignupForm();
});

/**
 * Handle Login Form Submission
 */
function initLoginForm() {
  const form = document.getElementById('signin-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);

    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    if (!email || !password) {
      showToast('Validation Error', 'Please enter both email and password.', 'warning');
      return;
    }

    setLoading(submitBtn, true, 'Signing In...');

    try {
      const response = await window.bcApi.signIn(email, password);
      showToast('Success', response.message || 'Login successful! Redirecting...', 'success');
      
      setTimeout(() => {
        window.location.href = 'donor-dashboard.html';
      }, 700);
    } catch (err) {
      console.error('Sign-in error:', err);
      if (err.isNetworkError) {
        showToast('Connection Refused', err.message, 'error');
        showFormAlert(form, `Backend offline at ${window.bcApi.baseUrl}. Start the Spring Boot server to authenticate.`);
      } else {
        showToast('Login Failed', err.message || 'Invalid email or password.', 'error');
        showFormAlert(form, err.message || 'Invalid email or password.');
      }
    } finally {
      setLoading(submitBtn, false, 'Sign In');
    }
  });
}

/**
 * Handle Signup / Donor Registration Form Submission
 */
function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;

  // Set max date for Date of Birth to yesterday
  const dobInput = document.getElementById('signup-dob');
  if (dobInput) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    dobInput.max = yesterday.toISOString().split('T')[0];
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors(form);

    const firstName = document.getElementById('signup-first-name').value.trim();
    const middleName = document.getElementById('signup-middle-name')?.value.trim() || null;
    const lastName = document.getElementById('signup-last-name').value.trim();
    const fatherName = document.getElementById('signup-father-name')?.value.trim() || null;
    const motherName = document.getElementById('signup-mother-name')?.value.trim() || null;
    const email = document.getElementById('signup-email').value.trim();
    const mobileNumber = document.getElementById('signup-mobile').value.trim();
    const dateOfBirth = document.getElementById('signup-dob').value;
    const bloodGroup = document.getElementById('signup-blood-group').value;
    const gender = document.getElementById('signup-gender').value;
    const medicalConditions = document.getElementById('signup-medical')?.value.trim() || null;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password')?.value;
    const consentAccepted = document.getElementById('signup-consent').checked;

    // Client-side validations matching Spring Boot backend annotations
    let hasError = false;

    if (!firstName) {
      setFieldError('signup-first-name', 'First name is required.');
      hasError = true;
    }
    if (!lastName) {
      setFieldError('signup-last-name', 'Last name is required.');
      hasError = true;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('signup-email', 'Please enter a valid email address.');
      hasError = true;
    }
    if (!mobileNumber || !/^[6-9][0-9]{9}$/.test(mobileNumber)) {
      setFieldError('signup-mobile', 'Enter a valid 10-digit Indian mobile number (starting with 6-9).');
      hasError = true;
    }
    if (!dateOfBirth) {
      setFieldError('signup-dob', 'Date of birth is required.');
      hasError = true;
    } else {
      const dobDate = new Date(dateOfBirth);
      if (dobDate >= new Date()) {
        setFieldError('signup-dob', 'Date of birth must be in the past.');
        hasError = true;
      }
    }
    if (!bloodGroup) {
      setFieldError('signup-blood-group', 'Please select a blood group.');
      hasError = true;
    }
    if (!gender) {
      setFieldError('signup-gender', 'Please select your gender.');
      hasError = true;
    }
    if (!password || password.length < 8 || password.length > 72) {
      setFieldError('signup-password', 'Password must be between 8 and 72 characters.');
      hasError = true;
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      setFieldError('signup-confirm-password', 'Passwords do not match.');
      hasError = true;
    }
    if (!consentAccepted) {
      setFieldError('signup-consent', 'You must agree to the privacy and blood donation consent.');
      hasError = true;
    }

    if (hasError) {
      showToast('Form Validation', 'Please fix the highlighted fields.', 'warning');
      return;
    }

    const payload = {
      firstName,
      middleName,
      lastName,
      fatherName,
      motherName,
      email,
      mobileNumber,
      dateOfBirth,
      bloodGroup,
      gender,
      medicalConditions,
      password,
      consentAccepted
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    setLoading(submitBtn, true, 'Registering Donor...');

    try {
      const response = await window.bcApi.signUp(payload);
      showToast('Registration Successful', 'Your account has been registered! You can now sign in.', 'success');
      
      // Auto sign-in or redirect to login
      setTimeout(async () => {
        try {
          await window.bcApi.signIn(email, password);
          window.location.href = 'donor-dashboard.html';
        } catch {
          window.location.href = 'login.html';
        }
      }, 900);
    } catch (err) {
      console.error('Sign-up error:', err);
      if (err.isNetworkError) {
        showToast('Connection Refused', err.message, 'error');
        showFormAlert(form, `Cannot connect to Spring Boot backend at ${window.bcApi.baseUrl}. Please ensure MySQL and Spring Boot are running.`);
      } else if (err.fieldErrors) {
        // Map backend field errors to form inputs
        Object.entries(err.fieldErrors).forEach(([field, msg]) => {
          const inputId = `signup-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          setFieldError(inputId, msg);
        });
        showToast('Validation Error', err.message || 'Please correct the highlighted fields.', 'error');
      } else {
        showToast('Registration Failed', err.message || 'Could not complete registration.', 'error');
        showFormAlert(form, err.message || 'Registration failed.');
      }
    } finally {
      setLoading(submitBtn, false, 'Complete Registration');
    }
  });
}

/**
 * UI Form Helper Utilities
 */
function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const parent = field.closest('.form-group') || field.parentElement;
  let feedback = parent.querySelector('.form-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'form-feedback';
    parent.appendChild(feedback);
  }
  feedback.textContent = message;
  feedback.classList.add('show');
  field.style.borderColor = 'var(--danger)';
}

function clearErrors(form) {
  form.querySelectorAll('.form-feedback').forEach(el => el.classList.remove('show'));
  form.querySelectorAll('.form-control, .form-select').forEach(el => el.style.borderColor = '');
  const alertBox = form.querySelector('.form-alert-banner');
  if (alertBox) alertBox.remove();
}

function showFormAlert(form, text) {
  let alertBox = form.querySelector('.form-alert-banner');
  if (!alertBox) {
    alertBox = document.createElement('div');
    alertBox.className = 'form-alert-banner';
    alertBox.style.cssText = 'background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); border-radius:var(--radius-md); padding:0.85rem; color:#FFA1A1; font-size:0.88rem; margin-bottom:1.25rem; display:flex; align-items:center; gap:0.5rem;';
    form.prepend(alertBox);
  }
  alertBox.innerHTML = `<span>⚠️</span> <span>${text}</span>`;
}

function setLoading(button, isLoading, text) {
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.setAttribute('data-original-text', button.innerHTML);
    button.innerHTML = `
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke="white"></path>
      </svg>
      <span>${text}</span>
    `;
  } else {
    const original = button.getAttribute('data-original-text');
    if (original) button.innerHTML = original;
  }
}
