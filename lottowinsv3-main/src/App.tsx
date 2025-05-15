import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardScreen from './screens/DashboardScreen';
import LotteryDetailScreen from './screens/LotteryDetailScreen';
import SmartPickScreen from './screens/SmartPickScreen';
import ResultsScreen from './screens/ResultsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import InvestmentsScreen from './screens/InvestmentsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import MainLayout from './layouts/MainLayout';
import StatesScreen from './screens/StatesScreen';
import LotteriesScreen from './screens/LotteriesScreen';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import GamesListScreen from './screens/GamesListScreen';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginScreen />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Main Routes */}
              <Route path="/" element={<MainLayout title="Dashboard"><DashboardScreen /></MainLayout>} />
              <Route path="/smart-pick" element={<MainLayout title="Smart Pick Generator"><SmartPickScreen /></MainLayout>} />
              <Route path="/results" element={<MainLayout title="Latest Results"><ResultsScreen /></MainLayout>} />
              <Route path="/notifications" element={<MainLayout title="Notifications"><NotificationsScreen /></MainLayout>} />
              <Route path="/investments" element={<MainLayout title="Millionaire Investments"><InvestmentsScreen /></MainLayout>} />
              <Route path="/profile" element={<MainLayout title="Profile"><ProfileScreen /></MainLayout>} />
              <Route path="/states" element={<MainLayout title="All States"><StatesScreen /></MainLayout>} />
              <Route path="/lotteries" element={<MainLayout title="All Lotteries"><LotteriesScreen /></MainLayout>} />
              <Route path="/lottery/games/:id" element={<LotteryDetailScreen />} />
              <Route path="/lottery/games" element={<MainLayout title="All Lottery Games"><GamesListScreen /></MainLayout>} />
              
              {/* Redirect any unknown routes */}
              <Route path="*" element={<Navigate to="/" />} />
            </Route>
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;