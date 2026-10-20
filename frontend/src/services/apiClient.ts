import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('zpz_access_token');
    const deviceSerial = localStorage.getItem('zpz_device_serial') || 'ZPZ-IND-TAB-04';
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.headers) {
      config.headers['X-Device-Serial'] = deviceSerial;
    }
  }
  return config;
});

export default apiClient;