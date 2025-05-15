import api from './api';
import axios from 'axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  refresh: string;
  access: string;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  profile_photo?: string;
}

class AuthService {
  /**
   * Login user and get tokens
   */
  async login(credentials: LoginCredentials): Promise<UserData> {
    try {
      // Limpar quaisquer tokens antigos antes de tentar login
      this.clearTokens();
      
      const response = await api.post<LoginResponse>('/login/', credentials);
      
      if (!response.data || !response.data.access || !response.data.refresh) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);

      // Buscar dados do usuário autenticado
      const userResponse = await api.get<UserData>('/users/me/');
      if (!userResponse.data) throw new Error('Failed to fetch user data');
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      return userResponse.data;
    } catch (error) {
      // Limpar tokens em caso de erro
      this.clearTokens();
      
      if (axios.isAxiosError(error)) {
        // Verificar se tem resposta do servidor
        if (error.response) {
          if (error.response.status === 401) {
            throw new Error('Invalid credentials');
          } else if (error.response.data && typeof error.response.data === 'object') {
            // Tratamento detalhado da resposta da API
            if (error.response.data.detail) {
              throw new Error(error.response.data.detail);
            } else if (error.response.data.non_field_errors) {
              throw new Error(error.response.data.non_field_errors[0]);
            }
          }
          throw new Error(`Server error: ${error.response.status}`);
        } else if (error.request) {
          // A requisição foi feita mas não houve resposta
          throw new Error('No response from server. Please check your connection.');
        }
      }
      
      throw new Error('Login failed. Please try again later.');
    }
  }


  /**
   * Logout user
   */
  logout(): void {
    this.clearTokens();
  }

  /**
   * Clear all tokens and user data
   */
  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return localStorage.getItem('access_token') !== null;
  }

  /**
   * Get stored user data
   */
  getUser(): UserData | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      const response = await api.post<{ access: string }>('/token/refresh/', {
        refresh: refreshToken
      });

      if (!response.data || !response.data.access) {
        this.clearTokens();
        return null;
      }

      const newAccessToken = response.data.access;
      localStorage.setItem('access_token', newAccessToken);
      return newAccessToken;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // If refresh fails, clear all tokens
      this.clearTokens();
      return null;
    }
  }

  /**
   * Atualiza os dados do usuário logado (nome, email, etc)
   */
  async updateProfile(data: { name: string; email: string }): Promise<UserData> {
    try {
      const response = await api.put<UserData>('/users/me/', data);
      if (!response.data) throw new Error('Invalid response from server');
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data && error.response.data.detail) {
          throw new Error(error.response.data.detail);
        }
      }
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Atualiza a foto de perfil do usuário logado (base64)
   */
  async updateProfilePhoto(profile_photo: string): Promise<UserData> {
    try {
      const response = await api.post<UserData>('/users/me/update_profile_photo/', { profile_photo });
      if (!response.data) throw new Error('Invalid response from server');
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.data && error.response.data.detail) {
          throw new Error(error.response.data.detail);
        }
      }
      throw new Error('Failed to update profile photo');
    }
  }

  /**
   * Troca a senha do usuário logado
   */
  async changePassword(old_password: string, new_password: string, new_password2: string): Promise<string> {
    try {
      const response = await api.post<{ detail: string }>('/users/me/change_password/', {
        old_password,
        new_password,
        new_password2,
      });
      return response.data.detail || 'Password changed successfully';
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data) {
        if (typeof error.response.data.detail === 'string') {
          throw new Error(error.response.data.detail);
        }
        // Django REST pode retornar erros de campo
        const firstError = Object.values(error.response.data)[0];
        if (Array.isArray(firstError)) throw new Error(firstError[0]);
        if (typeof firstError === 'string') throw new Error(firstError);
      }
      throw new Error('Failed to change password');
    }
  }
}

export default new AuthService(); 