import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'https://techzone-api-h69h.onrender.com/api/v1';

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;