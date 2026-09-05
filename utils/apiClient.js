/**
 * API Client for Academic Hunters
 * Handles all HTTP requests to backend endpoints
 * Manages JWT token and error handling
 */

class APIClient {
  constructor() {
    this.baseURL = window.location.origin;
    this.token = localStorage.getItem('ah_token');
  }

  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('ah_token', token);
  }

  /**
   * Get headers with authorization
   */
  getHeaders(includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Generic fetch wrapper
   */
  async request(method, endpoint, data = null) {
    try {
      const options = {
        method,
        headers: this.getHeaders(),
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, options);
      const json = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired - logout
          this.logout();
          window.location.href = '/';
        }
        throw new Error(json.error || 'Request failed');
      }

      return json;
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Authentication Endpoints
   */

  async sendOTP(phoneNumber, fullName) {
    return this.request('POST', '/api/auth/send-otp', {
      phoneNumber,
      fullName,
    });
  }

  async verifyOTP(phoneNumber, otp, sessionId) {
    const response = await this.request('POST', '/api/auth/verify-otp', {
      phoneNumber,
      otp,
      sessionId,
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  /**
   * Notes Endpoints
   */

  async getNotes(noteId = null) {
    const endpoint = noteId ? `/api/notes?id=${noteId}` : '/api/notes';
    return this.request('GET', endpoint);
  }

  async createNote(title, content, subject, className, fileData = null) {
    const data = {
      title,
      content,
      subject,
      className,
    };

    if (fileData) {
      data.fileData = fileData;
    }

    return this.request('POST', '/api/notes', data);
  }

  async updateNote(noteId, updates) {
    return this.request('PUT', `/api/notes?id=${noteId}`, updates);
  }

  async deleteNote(noteId) {
    return this.request('DELETE', `/api/notes?id=${noteId}`);
  }

  /**
   * Bookmarks Endpoints
   */

  async getBookmarks() {
    return this.request('GET', '/api/bookmarks');
  }

  async bookmarkNote(noteId) {
    return this.request('POST', `/api/bookmarks?noteId=${noteId}`);
  }

  async removeBookmark(noteId) {
    return this.request('DELETE', `/api/bookmarks?noteId=${noteId}`);
  }

  /**
   * Likes Endpoints
   */

  async getLikes(noteId) {
    return this.request('GET', `/api/likes?noteId=${noteId}`);
  }

  async likeNote(noteId) {
    return this.request('POST', `/api/likes?noteId=${noteId}`);
  }

  async unlikeNote(noteId) {
    return this.request('DELETE', `/api/likes?noteId=${noteId}`);
  }

  /**
   * Chat Endpoint
   */

  async sendMessage(message, history = [], assistant = '', subject = '') {
    return this.request('POST', '/api/chat', {
      message,
      history,
      assistant,
      subject,
    });
  }

  /**
   * Payment Endpoints
   */

  async initiatePayment(noteId, amount, phoneNumber) {
    return this.request('POST', '/api/payment', {
      noteId,
      amount,
      phoneNumber,
    });
  }

  async checkPaymentStatus(referenceId) {
    return this.request('GET', `/api/payment?referenceId=${referenceId}`);
  }

  /**
   * Download Endpoint
   */

  async getDownloadLink(noteId) {
    return this.request('GET', `/api/download?noteId=${noteId}`);
  }

  /**
   * Logout
   */
  logout() {
    this.token = null;
    localStorage.removeItem('ah_token');
    localStorage.removeItem('ah_user');
  }
}

// Export for use in HTML
window.apiClient = new APIClient();
