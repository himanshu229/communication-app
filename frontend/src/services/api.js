// API service for HTTP requests
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class ApiService {
  // Generic fetch method with error handling
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Backend already returns { success: true/false, data/error }
      // So return it directly instead of wrapping it
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Auth related API calls
  async registerUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginUser(credentials) {
    return this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // User related API calls
  async getAllUsers() {
    return this.request('/users');
  }

  async getUserById(userId) {
    return this.request(`/users/${userId}`);
  }

  async updateUserStatus(userId, isOnline) {
    return this.request(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isOnline }),
    });
  }

  // Chat related API calls
  async getOrCreateRoom(userId1, userId2) {
    return this.request(`/room/${userId1}/${userId2}`);
  }

  async getRoomMessages(roomId) {
    return this.request(`/messages/${roomId}`);
  }

  async sendMessage(messageData) {
    return this.request('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  // Room related API calls
  async createRoom(roomData) {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  }

  async getUserRooms(userId) {
    return this.request(`/rooms/user/${userId}`);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;