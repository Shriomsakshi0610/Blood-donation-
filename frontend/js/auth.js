/**
 * BloodConnect — Authentication Controller (Sign In & Sign Up)
 * Integrates directly with Spring Boot AuthController endpoints:
 * - POST /api/auth/signin
 * - POST /api/auth/signup
 */

document.addEventListener('DOMContentLoaded', () => {
  // If already authenticated, redirect away from signin/signup
  if (typeof redirectIfAuthenticated === 'function') {
    redirectIfAuthenticated();
  }

  initLoginForm();
  initSignupForm();
  initLiveFieldValidation();
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

    const emailInput = document.getElementById('signin-email');
    const passwordInput = document.getElementById('signin-password');
    const submitBtn = form.querySelector('button[type="submit"]');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    // Validate inputs
    let hasError = false;
    if (!email) {
      setFieldError('signin-email', 'Please enter your registered email address.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('signin-email', 'Please enter a valid email address.');
      hasError = true;
    }

    if (!password) {
      setFieldError('signin-password', 'Please enter your password.');
      hasError = true;
    }

    if (hasError) return;

    // Prevent duplicate submission
    setLoading(submitBtn, true, 'Signing In...');

    try {
      const response = await window.bcApi.signIn(email, password);
      showToast('Welcome!', response.message || 'Login successful! Redirecting...', 'success');

      // Check if user is admin or regular donor
      const user = response.user || window.bcApi.getCurrentUser();
      const isAdmin = user && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN');

      const redirectUrl = isAdmin
        ? 'admin-dashboard.html'
        : (sessionStorage.getItem('bc_redirect_after_login') || 'donor-dashboard.html');

      sessionStorage.removeItem('bc_redirect_after_login');

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 500);
    } catch (err) {
      console.error('Sign-in error:', err);
      if (err.isNetworkError) {
        showToast('Connection Refused', err.message, 'error');
        showFormAlert(form, `Cannot connect to Spring Boot backend at ${window.bcApi.baseUrl}. Please verify that the server is running.`);
      } else if (err.status === 401) {
        showToast('Invalid Credentials', 'The email or password you entered is incorrect.', 'error');
        setFieldError('signin-email', 'Incorrect email or password.');
        setFieldError('signin-password', 'Incorrect email or password.');
        if (passwordInput) passwordInput.value = '';
      } else {
        showToast('Login Failed', err.message || 'Authentication failed. Please try again.', 'error');
        showFormAlert(form, err.message || 'Authentication failed.');
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

    const firstName = document.getElementById('signup-first-name')?.value.trim() || '';
    const middleName = document.getElementById('signup-middle-name')?.value.trim() || null;
    const lastName = document.getElementById('signup-last-name')?.value.trim() || '';
    const fatherName = document.getElementById('signup-father-name')?.value.trim() || null;
    const motherName = document.getElementById('signup-mother-name')?.value.trim() || null;
    const email = document.getElementById('signup-email')?.value.trim() || '';
    const mobileNumber = document.getElementById('signup-mobile')?.value.trim() || '';
    const dateOfBirth = document.getElementById('signup-dob')?.value || '';
    const bloodGroup = document.getElementById('signup-blood-group')?.value || '';
    const gender = document.getElementById('signup-gender')?.value || '';
    const medicalConditions = document.getElementById('signup-medical')?.value.trim() || null;
    const password = document.getElementById('signup-password')?.value || '';
    const confirmPassword = document.getElementById('signup-confirm-password')?.value || '';
    const consentAccepted = document.getElementById('signup-consent')?.checked || false;

    // Client-side validations matching Spring Boot backend constraints
    let hasError = false;

    if (!firstName) {
      setFieldError('signup-first-name', 'First name is required (max 80 characters).');
      hasError = true;
    }
    if (!lastName) {
      setFieldError('signup-last-name', 'Last name is required (max 80 characters).');
      hasError = true;
    }
    if (!email) {
      setFieldError('signup-email', 'Email address is required.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('signup-email', 'Please enter a valid email address (e.g. rahul@example.com).');
      hasError = true;
    }
    if (!mobileNumber) {
      setFieldError('signup-mobile', 'Mobile number is required.');
      hasError = true;
    } else if (!/^[6-9][0-9]{9}$/.test(mobileNumber)) {
      setFieldError('signup-mobile', 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      hasError = true;
    }
    if (!dateOfBirth) {
      setFieldError('signup-dob', 'Date of birth is required.');
      hasError = true;
    } else {
      const dobDate = new Date(dateOfBirth);
      const today = new Date();
      if (dobDate >= today) {
        setFieldError('signup-dob', 'Date of birth must be in the past.');
        hasError = true;
      }
    }
    if (!bloodGroup) {
      setFieldError('signup-blood-group', 'Please select your blood group.');
      hasError = true;
    }
    if (!gender) {
      setFieldError('signup-gender', 'Please select your gender.');
      hasError = true;
    }
    if (!password) {
      setFieldError('signup-password', 'Password is required.');
      hasError = true;
    } else if (password.length < 8 || password.length > 72) {
      setFieldError('signup-password', 'Password must be between 8 and 72 characters long.');
      hasError = true;
    }
    if (password !== confirmPassword) {
      setFieldError('signup-confirm-password', 'Passwords do not match. Please re-enter.');
      hasError = true;
    }
    if (!consentAccepted) {
      setFieldError('signup-consent', 'You must agree to the privacy and voluntary blood donation consent.');
      hasError = true;
    }

    if (hasError) {
      showToast('Validation Error', 'Please correct the highlighted fields before submitting.', 'warning');
      const firstInvalid = form.querySelector('.form-feedback.show');
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
      showToast('Registration Successful', 'Your account has been created! Signing you in...', 'success');

      // Seamlessly sign in user and transition to dashboard
      try {
        await window.bcApi.signIn(email, password);
        setTimeout(() => {
          window.location.href = 'donor-dashboard.html';
        }, 700);
      } catch (loginErr) {
        // If automatic login failed, redirect to login page
        showToast('Account Created', 'Registration complete! Please sign in with your credentials.', 'info');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 800);
      }
    } catch (err) {
      console.error('Sign-up error:', err);
      if (err.isNetworkError) {
        showToast('Connection Refused', err.message, 'error');
        showFormAlert(form, `Cannot connect to Spring Boot backend at ${window.bcApi.baseUrl}. Please verify the server is running.`);
      } else if (err.status === 409) {
        // Specific conflict detection (email vs mobile)
        const msg = err.message || '';
        if (msg.toLowerCase().includes('email')) {
          setFieldError('signup-email', 'This email address is already registered. Please sign in instead.');
        } else if (msg.toLowerCase().includes('mobile')) {
          setFieldError('signup-mobile', 'This mobile number is already registered. Please use another.');
        } else {
          showFormAlert(form, msg || 'Email or mobile number is already registered.');
        }
        showToast('Registration Conflict', msg || 'Email or mobile number is already registered.', 'warning');
      } else if (err.fieldErrors) {
        // Map backend validation errors to inputs
        Object.entries(err.fieldErrors).forEach(([field, msg]) => {
          const inputId = `signup-${field.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          setFieldError(inputId, msg);
        });
        showToast('Validation Failed', 'Please fix the highlighted fields.', 'error');
      } else {
        showToast('Registration Failed', err.message || 'Could not complete registration.', 'error');
        showFormAlert(form, err.message || 'Registration failed.');
      }
    } finally {
      setLoading(submitBtn, false, 'Complete Registration & Become a Donor');
    }
  });
}

/**
 * Setup live input listener to clear field error styling as user types
 */
function initLiveFieldValidation() {
  document.querySelectorAll('input, select, textarea').forEach(input => {
    input.addEventListener('input', () => {
      clearSingleFieldError(input);
    });
    input.addEventListener('change', () => {
      clearSingleFieldError(input);
    });
  });
}

function clearSingleFieldError(input) {
  if (!input) return;
  input.style.borderColor = '';
  const parent = input.closest('.form-group') || input.parentElement;
  if (parent) {
    const feedback = parent.querySelector('.form-feedback');
    if (feedback) feedback.classList.remove('show');
  }
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
    feedback.style.cssText = 'color:#EF4444; font-size:0.82rem; margin-top:0.35rem; display:none;';
    parent.appendChild(feedback);
  }
  feedback.textContent = message;
  feedback.style.display = 'block';
  feedback.classList.add('show');
  field.style.borderColor = 'var(--danger, #EF4444)';
}

function clearErrors(form) {
  form.querySelectorAll('.form-feedback').forEach(el => {
    el.classList.remove('show');
    el.style.display = 'none';
  });
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
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite; display:inline-block; vertical-align:middle; margin-right:6px;">
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
