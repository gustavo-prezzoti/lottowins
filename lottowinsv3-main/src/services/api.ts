import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Se não foi possível encontrar o servidor, retornar o erro original
    if (!error.response) {
      return Promise.reject(error);
    }
    
    // Apenas tente renovar o token se for erro 401 e não for a rota de login
    if (error.response.status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url?.includes('/login/')) {
      
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          // Sem refresh token, redireciona para login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          localStorage.removeItem('isAuthenticated');
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Tenta obter um novo token
        const response = await axios.post('/api/token/refresh/', {
          refresh: refreshToken
        });
        
        if (response.data.access) {
          // Salva o novo token
          localStorage.setItem('access_token', response.data.access);
          
          // Atualiza o cabeçalho de Authorization
          api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          
          // Tenta a requisição original novamente
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Falha ao atualizar o token, limpa os dados e redireciona
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Para outros erros, apenas rejeita a promise
    return Promise.reject(error);
  }
);

export default api; 