/**
 * BloodConnect — Central API Client
 * Connects to Java Spring Boot Backend (Local development: http://localhost:8080 | Production: https://blood-donation-1mnb.onrender.com)
 */

class BloodConnectApi {
  constructor() {
    this.cloudBaseUrl = 'https://blood-donation-1mnb.onrender.com';
    const host = (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') ? '127.0.0.1' : 'localhost';
    this.localBaseUrl = `http://${host}:8080`;

    // Check manual override first
    const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('bloodconnect_api_url') : null;
    if (saved) {
      this.baseUrl = saved.replace(/\/+$/, '');
    } else {
      // Default initial assumption: match current host for zero-friction local development
      const isLocalHost = (typeof window !== 'undefined') && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === ''
      );
      this.baseUrl = isLocalHost ? this.localBaseUrl : this.cloudBaseUrl;
    }

    this.csrfToken = null;
    this.csrfHeaderName = 'X-XSRF-TOKEN';
    this.isBackendOnline = null;
    this._probePromise = null;
  }

  /**
   * Set API base URL manually and persist
   */
  setBaseUrl(url) {
    if (!url) return;
    this.baseUrl = url.replace(/\/+$/, '');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bloodconnect_api_url', this.baseUrl);
    }
    this.csrfToken = null;
    this.isBackendOnline = null;
  }

  /**
   * Probes localhost and cloud backend with a short timeout.
   * If localhost:8080 is reachable, prefers localhost for local development.
   * If localhost is offline, automatically switches to Render cloud backend.
   */
  async autoDetectBackend() {
    if (this._probePromise) return this._probePromise;

    this._probePromise = (async () => {
      // If user explicitly saved an override in localStorage, stick with it
      const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('bloodconnect_api_url') : null;
      if (saved) {
        this.baseUrl = saved;
        return this.checkHealth();
      }

      // Check current base URL first with a 1500ms timeout
      const currentOk = await this._quickPing(this.baseUrl, 1500);
      if (currentOk) {
        this.isBackendOnline = true;
        return true;
      }

      // If current was local and failed, try cloud
      if (this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')) {
        console.info('[BloodConnect API] Local backend offline, testing cloud backend...');
        const cloudOk = await this._quickPing(this.cloudBaseUrl, 3000);
        if (cloudOk) {
          console.info('[BloodConnect API] Seamlessly connected to Cloud Backend on Render.');
          this.baseUrl = this.cloudBaseUrl;
          this.isBackendOnline = true;
          return true;
        }
      } else {
        // If current was cloud and failed, check local
        const localOk = await this._quickPing(this.localBaseUrl, 1200);
        if (localOk) {
          console.info('[BloodConnect API] Local backend detected, switching to localhost:8080.');
          this.baseUrl = this.localBaseUrl;
          this.isBackendOnline = true;
          return true;
        }
      }

      this.isBackendOnline = false;
      return false;
    })();

    return this._probePromise;
  }

  async _quickPing(url, timeoutMs = 2000) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${url}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.token) {
          this.csrfToken = data.token;
          if (data.headerName) this.csrfHeaderName = data.headerName;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if backend is active and reachable
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      this.isBackendOnline = response.ok;
      if (this.isBackendOnline) {
        const data = await response.json().catch(() => null);
        if (data && data.token) {
          this.csrfToken = data.token;
          if (data.headerName) this.csrfHeaderName = data.headerName;
        }
      }
      return this.isBackendOnline;
    } catch (err) {
      console.warn('[BloodConnect API] Health check failed for ' + this.baseUrl, err.message);
      this.isBackendOnline = false;
      return false;
    }
  }

  /**
   * Fetch CSRF Token from Spring Security
   */
  async getCsrfToken(forceFresh = false) {
    if (!forceFresh && this.csrfToken) {
      return this.csrfToken;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/auth/csrf`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.token) {
          this.csrfToken = data.token;
          if (data.headerName) this.csrfHeaderName = data.headerName;
          return this.csrfToken;
        }
      }
    } catch (err) {
      console.warn('[BloodConnect API] Could not retrieve CSRF token:', err.message);
    }

    // Fallback for same-origin local development only: read XSRF-TOKEN cookie if present
    if (!this.csrfToken && typeof document !== 'undefined') {
      const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      if (cookieMatch && cookieMatch[1]) {
        this.csrfToken = decodeURIComponent(cookieMatch[1]);
      }
    }

    return this.csrfToken;
  }

  /**
   * Reusable fetch wrapper with credentials, CSRF header, error parsing,
   * and automatic 1-time retry on 403 CSRF token mismatch.
   */
  async request(endpoint, options = {}) {
    // Ensure backend is detected before first mutating call
    if (this.isBackendOnline === null) {
      await this.autoDetectBackend().catch(() => {});
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    // Attach CSRF token on mutating requests
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      if (!this.csrfToken) {
        await this.getCsrfToken(true);
      }
      if (this.csrfToken) {
        headers[this.csrfHeaderName || 'X-XSRF-TOKEN'] = this.csrfToken;
      }
    }

    const config = {
      ...options,
      headers,
      credentials: 'include' // Required for JSESSIONID and XSRF-TOKEN cookies
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (netErr) {
      // If primary failed on localhost, try failover to cloud
      if (!options._isFailover && this.baseUrl !== this.cloudBaseUrl) {
        console.warn(`[BloodConnect API] Call to ${this.baseUrl} failed. Trying Cloud Backend...`);
        const cloudOk = await this._quickPing(this.cloudBaseUrl, 2000);
        if (cloudOk) {
          this.baseUrl = this.cloudBaseUrl;
          this.csrfToken = null;
          return this.request(endpoint, { ...options, _isFailover: true });
        }
      }

      const error = new Error(`Cannot connect to Spring Boot backend at ${this.baseUrl}. Please verify that the server is running.`);
      error.isNetworkError = true;
      throw error;
    }

    // Handle 403 CSRF token expiration/rotation with a 1-time fresh retry
    if (response.status === 403 && !options._isRetry && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      console.warn('[BloodConnect API] 403 received on mutating request. Refreshing CSRF token and retrying...');
      await this.getCsrfToken(true);
      return this.request(endpoint, { ...options, _isRetry: true });
    }

    // Parse response body
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      let errorFields = null;

      if (data) {
        if (data.message) errorMessage = data.message;
        if (data.errors) errorFields = data.errors;
      } else if (response.status === 401) {
        errorMessage = 'Invalid email or password.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied or session expired. Please sign in again.';
      } else if (response.status === 404) {
        errorMessage = 'Requested resource not found.';
      } else if (response.status === 409) {
        errorMessage = 'Email or mobile number is already registered.';
      }

      const err = new Error(errorMessage);
      err.status = response.status;
      err.data = data;
      err.fieldErrors = errorFields;
      throw err;
    }

    return data;
  }

  /* =========================================================================
     Authentication Endpoints
     ========================================================================= */

  /**
   * Sign Up (POST /api/auth/signup)
   */
  async signUp(data) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Sign In (POST /api/auth/signin)
   */
  async signIn(email, password) {
    const res = await this.request('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password })
    });

    if (res && res.user) {
      this.setSession(res.user);
    }

    // Refresh CSRF token for the new authenticated session
    await this.getCsrfToken(true).catch(() => {});

    return res;
  }

  /**
   * Logout (POST /api/auth/logout)
   */
  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('[BloodConnect API] Logout call error or server offline:', e.message);
    } finally {
      this.clearSession();
    }
    return { success: true };
  }

  /**
   * Get Current Authenticated Profile (GET /api/profile)
   */
  async getProfile() {
    const profile = await this.request('/api/profile', { method: 'GET' });
    if (profile) {
      this.setSession(profile);
    }
    return profile;
  }

  /**
   * Update Profile (PUT /api/profile)
   */
  async updateProfile(data) {
    const updated = await this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (updated) {
      this.setSession(updated);
    }
    return updated;
  }

  /**
   * Public Database Statistics (GET /api/stats)
   */
  async getPublicStats() {
    return this.request('/api/stats', { method: 'GET' });
  }

  /**
   * Admin Health (GET /api/admin/health)
   */
  async getAdminHealth() {
    return this.request('/api/admin/health', { method: 'GET' });
  }

  /**
   * Admin Users Directory (GET /api/admin/users)
   */
  async getAdminUsers() {
    return this.request('/api/admin/users', { method: 'GET' });
  }

  /**
   * Admin Statistics (GET /api/admin/stats)
   */
  async getAdminStats() {
    return this.request('/api/admin/stats', { method: 'GET' });
  }

  /* =========================================================================
     Session & Storage Helpers (Persistent across page reloads & tabs)
     ========================================================================= */

  setSession(user) {
    if (!user) return;
    const cleanUser = { ...user };
    const str = JSON.stringify(cleanUser);
    try {
      sessionStorage.setItem('bc_user', str);
      localStorage.setItem('bc_user', str);
    } catch (e) {
      console.warn('[BloodConnect API] Session storage error:', e);
    }
  }

  getCurrentUser() {
    try {
      const raw = sessionStorage.getItem('bc_user') || localStorage.getItem('bc_user');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  isAuthenticated() {
    return !!this.getCurrentUser();
  }

  isAdmin() {
    const user = this.getCurrentUser();
    return !!(user && (user.role === 'ADMIN' || user.role === 'ROLE_ADMIN'));
  }

  clearSession() {
    try {
      sessionStorage.removeItem('bc_user');
      localStorage.removeItem('bc_user');
    } catch {}
    this.csrfToken = null;
  }

  /* =========================================================================
     Community Dataset & Features
     ========================================================================= */

  async searchDonors(filters = {}) {
    const dummyDonors = [
      { id: 101, name: "Dr. Aryan Verma", bloodGroup: "O_POSITIVE", city: "New Delhi", pincode: "110001", distance: "2.4 km", available: true, verified: true, donations: 14, lastDonated: "2026-08-15" },
      { id: 102, name: "Pooja Deshmukh", bloodGroup: "A_POSITIVE", city: "Mumbai", pincode: "400001", distance: "4.1 km", available: true, verified: true, donations: 8, lastDonated: "2026-09-10" },
      { id: 103, name: "Vikram Rathore", bloodGroup: "B_POSITIVE", city: "Bengaluru", pincode: "560001", distance: "1.8 km", available: true, verified: true, donations: 21, lastDonated: "2026-07-22" },
      { id: 104, name: "Sneha Nair", bloodGroup: "AB_POSITIVE", city: "Kochi", pincode: "682001", distance: "5.6 km", available: false, verified: true, donations: 5, lastDonated: "2026-10-01" },
      { id: 105, name: "Rohan Kulkarni", bloodGroup: "O_NEGATIVE", city: "Pune", pincode: "411001", distance: "3.2 km", available: true, verified: true, donations: 18, lastDonated: "2026-08-30" },
      { id: 106, name: "Ananya Sen", bloodGroup: "A_NEGATIVE", city: "Kolkata", pincode: "700001", distance: "6.0 km", available: true, verified: false, donations: 3, lastDonated: "2026-06-12" },
      { id: 107, name: "Gurpreet Singh", bloodGroup: "B_NEGATIVE", city: "Chandigarh", pincode: "160001", distance: "3.8 km", available: true, verified: true, donations: 11, lastDonated: "2026-09-18" },
      { id: 108, name: "Meera Krishnan", bloodGroup: "AB_NEGATIVE", city: "Chennai", pincode: "600001", distance: "7.5 km", available: true, verified: true, donations: 9, lastDonated: "2026-07-04" },
      { id: 109, name: "Amitabh Banerjee", bloodGroup: "O_POSITIVE", city: "Kolkata", pincode: "700019", distance: "2.1 km", available: true, verified: true, donations: 16, lastDonated: "2026-09-02" },
      { id: 110, name: "Fatima Sheikh", bloodGroup: "B_POSITIVE", city: "Hyderabad", pincode: "500001", distance: "4.5 km", available: true, verified: true, donations: 7, lastDonated: "2026-08-20" }
    ];

    let results = [...dummyDonors];

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.bloodGroup) {
      results.unshift({
        id: currentUser.id || 999,
        name: `${currentUser.firstName} ${currentUser.lastName || ''} (You)`,
        bloodGroup: currentUser.bloodGroup,
        city: "Your Location",
        pincode: "Current",
        distance: "0.0 km",
        available: true,
        verified: true,
        donations: 4,
        lastDonated: "2026-09-25",
        isCurrent: true
      });
    }

    if (filters.bloodGroup && filters.bloodGroup !== 'ALL') {
      results = results.filter(d => d.bloodGroup === filters.bloodGroup);
    }
    if (filters.city) {
      const q = filters.city.toLowerCase();
      results = results.filter(d => d.city.toLowerCase().includes(q) || d.pincode.includes(q));
    }
    if (filters.onlyAvailable) {
      results = results.filter(d => d.available);
    }
    if (filters.onlyVerified) {
      results = results.filter(d => d.verified);
    }

    return results;
  }

  async createBloodRequest(requestData) {
    const existing = JSON.parse(sessionStorage.getItem('bc_requests') || '[]');
    const newReq = {
      id: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      ...requestData
    };
    existing.unshift(newReq);
    sessionStorage.setItem('bc_requests', JSON.stringify(existing));
    return newReq;
  }

  async getBloodRequests() {
    const defaultRequests = [
      { id: 'REQ-8821', patientName: "Aarav Sharma", bloodGroup: "O_POSITIVE", units: 2, hospital: "Apollo Hospital, Bannerghatta", city: "Bengaluru", urgency: "CRITICAL", requiredDate: "2026-11-03", status: "PENDING", contact: "+91 98450 12345" },
      { id: 'REQ-8820', patientName: "Priyanka Roy", bloodGroup: "B_NEGATIVE", units: 3, hospital: "AIIMS New Delhi", city: "New Delhi", urgency: "HIGH", requiredDate: "2026-11-04", status: "DONOR_ASSIGNED", contact: "+91 98111 67890" },
      { id: 'REQ-8819', patientName: "Mohammed Farooq", bloodGroup: "AB_POSITIVE", units: 1, hospital: "Fortis Memorial, Gurugram", city: "Gurugram", urgency: "NORMAL", requiredDate: "2026-11-05", status: "FULFILLED", contact: "+91 99990 44321" },
      { id: 'REQ-8818', patientName: "Kavita Rao", bloodGroup: "A_POSITIVE", units: 2, hospital: "Manipal Hospital, Old Airport Rd", city: "Bengaluru", urgency: "HIGH", requiredDate: "2026-11-04", status: "PENDING", contact: "+91 98800 55443" }
    ];
    const userCreated = JSON.parse(sessionStorage.getItem('bc_requests') || '[]');
    return [...userCreated, ...defaultRequests];
  }

  async getCamps() {
    return [
      {
        id: "CAMP-101",
        name: "Metro LifeLine Mega Blood Drive",
        organizer: "Red Cross Society & Rotary Club",
        date: "2026-11-08",
        time: "09:00 AM - 04:00 PM",
        venue: "Community Centre, Indiranagar, Bengaluru",
        city: "Bengaluru",
        targetUnits: 250,
        registered: 142,
        contact: "+91 80 2525 0000"
      },
      {
        id: "CAMP-102",
        name: "Corporate Life Savers Camp",
        organizer: "BloodConnect Foundation & TechPark Association",
        date: "2026-11-12",
        time: "10:00 AM - 05:00 PM",
        venue: "DLF Cyber City, Tower B Concourse, Gurugram",
        city: "Gurugram",
        targetUnits: 300,
        registered: 215,
        contact: "+91 124 400 8899"
      },
      {
        id: "CAMP-103",
        name: "University Blood Heroes Camp",
        organizer: "NSS Cell & Lions Blood Bank",
        date: "2026-11-16",
        time: "08:30 AM - 03:30 PM",
        venue: "St. Xavier's College Quadrangle, Mumbai",
        city: "Mumbai",
        targetUnits: 180,
        registered: 96,
        contact: "+91 22 2262 0661"
      },
      {
        id: "CAMP-104",
        name: "Heritage City Voluntary Donation Drive",
        organizer: "State Blood Transfusion Council",
        date: "2026-11-20",
        time: "09:30 AM - 04:30 PM",
        venue: "Rotary Bhavan, J.N. Road, Kolkata",
        city: "Kolkata",
        targetUnits: 200,
        registered: 110,
        contact: "+91 33 2289 1234"
      }
    ];
  }
}

// Global API instance
window.bcApi = new BloodConnectApi();
// Trigger non-blocking auto-detection
window.bcApi.autoDetectBackend().catch(() => {});
