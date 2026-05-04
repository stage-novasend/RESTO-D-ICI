import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:3000/auth' });

export const authService = {
  register: (data) => API.post('/register', data),
  login: (data) => API.post('/login', data),
  setToken: (token) => {
    localStorage.setItem('token', token);
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  getToken: () => localStorage.getItem('token'),
  logout: () => {
    localStorage.removeItem('token');
    delete API.defaults.headers.common['Authorization'];
  }
};