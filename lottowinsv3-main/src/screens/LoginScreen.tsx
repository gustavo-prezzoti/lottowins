import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Card from '../components/Card';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  
  // If user is already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // Limpar mensagem de erro após 3 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };
  
  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    }
    setPasswordError('');
    return true;
  };
  
  const handleLogin = async () => {
    // Reset errors
    setError('');
    setEmailError('');
    setPasswordError('');
    
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    
    setIsLoading(true);
    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password');
        setPassword(''); // Limpar apenas a senha
        setIsLoading(false);
      } else {
        navigate(from, { replace: true });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during login';
      setError(errorMessage);
      setPassword(''); // Limpar apenas a senha
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleLogin();
    }
  };
  
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-dark mb-2">Lotto Wins</h1>
          <p className="text-text-muted">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-muted mb-1">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">
                <Mail size={18} />
              </span>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={() => validateEmail(email)}
                onKeyDown={handleKeyPress}
                className={`w-full pl-10 pr-4 py-2 border ${emailError ? 'border-red-500' : 'border-border'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>
            {emailError && (
              <p className="text-red-500 text-xs mt-1">{emailError}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-muted mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">
                <Lock size={18} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) validatePassword(e.target.value);
                }}
                onBlur={() => validatePassword(password)}
                onKeyDown={handleKeyPress}
                className={`w-full pl-10 pr-12 py-2 border ${passwordError ? 'border-red-500' : 'border-border'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordError && (
              <p className="text-red-500 text-xs mt-1">{passwordError}</p>
            )}
          </div>
          
          <Button
            className="w-full py-2"
            disabled={isLoading}
            type="button"
            isLoading={isLoading}
            onClick={handleLogin}
          >
            Sign In
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LoginScreen;