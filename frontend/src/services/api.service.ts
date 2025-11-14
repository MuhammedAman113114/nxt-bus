import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await axios.post(`${API_URL}/auth/refresh`, {
                refreshToken,
              });
              
              // Store new tokens (token rotation)
              localStorage.setItem('accessToken', response.data.accessToken);
              if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
              }
              
              // Retry original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
                return axios(error.config);
              }
            } catch (refreshError) {
              // Refresh failed, logout user
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(email: string, password: string, role: string = 'passenger') {
    const response = await this.api.post('/auth/register', { email, password, role });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async logout() {
    const response = await this.api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Stop endpoints
  async getAllStops() {
    const response = await this.api.get('/stops');
    return response.data;
  }

  async getStopById(id: string) {
    const response = await this.api.get(`/stops/${id}`);
    return response.data;
  }

  async getStopByQRCode(qrCode: string) {
    const response = await this.api.get(`/stops/qr/${qrCode}`);
    return response.data;
  }

  async getNearbyStops(lat: number, lng: number, radius: number = 1) {
    const response = await this.api.get(`/stops/nearby/${lat}/${lng}?radius=${radius}`);
    return response.data;
  }

  // Route endpoints
  async getAllRoutes() {
    const response = await this.api.get('/routes');
    return response.data;
  }

  async getRouteById(id: string) {
    const response = await this.api.get(`/routes/${id}`);
    return response.data;
  }

  async getRouteStops(id: string) {
    const response = await this.api.get(`/routes/${id}/stops`);
    return response.data;
  }

  async getActiveBusesOnRoute(id: string) {
    const response = await this.api.get(`/routes/${id}/buses`);
    return response.data;
  }

  // Bus endpoints
  async getBusById(id: string) {
    const response = await this.api.get(`/buses/${id}`);
    return response.data;
  }

  async getBusLocation(id: string) {
    const response = await this.api.get(`/buses/${id}/location`);
    return response.data;
  }

  async getBusHistory(id: string, limit: number = 50) {
    const response = await this.api.get(`/buses/${id}/history?limit=${limit}`);
    return response.data;
  }

  // Subscription endpoints
  async getSubscriptions() {
    const response = await this.api.get('/subscriptions');
    return response.data;
  }

  async subscribe(routeId: string, stopId: string, advanceMinutes: number = 10) {
    const response = await this.api.post('/subscriptions', {
      routeId,
      stopId,
      advanceMinutes,
      channels: ['push'],
    });
    return response.data;
  }

  async unsubscribe(routeId: string, stopId: string) {
    const response = await this.api.delete(`/subscriptions/${routeId}/${stopId}`);
    return response.data;
  }

  async updateSubscriptionPreferences(
    subscriptionId: string,
    advanceMinutes: number,
    channels: string[]
  ) {
    const response = await this.api.patch(`/subscriptions/${subscriptionId}`, {
      advanceMinutes,
      channels,
    });
    return response.data;
  }
}

export default new ApiService();
