import React, { useState, useEffect, useCallback } from 'react';
import NotificationItem from '../components/NotificationItem';
import { useWindowSize } from '../hooks/useWindowSize';
import { Bell, BellOff, CheckCheck, ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import notificationService, { Notification } from '../services/notificationService';
import authService from '../services/authService';

// Custom class for the notifications screen
import './NotificationsScreen/notificationStyles.css';

const NotificationsScreen: React.FC = () => {
  const { isMobile } = useWindowSize();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNotifications, setHasNotifications] = useState(false);

  // Pagination state
  const NOTIFICATIONS_PER_PAGE = isMobile ? 5 : 6;
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [markingAsRead, setMarkingAsRead] = useState<number | null>(null);
  const [markAllSuccess, setMarkAllSuccess] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!authService.isAuthenticated()) {
      setLoading(false);
      setError('You need to be logged in to view notifications');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getNotifications();
      setNotifications(response.results);
      setUnreadCount(response.unread_count);
      setHasNotifications(response.has_notifications);
    } catch (err) {
      setError('Failed to load notifications. Please try again later.');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark a notification as read
  const handleMarkAsRead = async (id: number) => {
    try {
      setMarkingAsRead(id);
      const response = await notificationService.markAsRead(id);
      
      if (response.success) {
        // Update local state with the updated notification
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? response.notification
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    } finally {
      setMarkingAsRead(null);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await notificationService.markAllAsRead();
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        );
        setUnreadCount(0);
        setMarkAllSuccess(true);
        
        // Reset success message after 3 seconds
        setTimeout(() => {
          setMarkAllSuccess(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter notifications
  let filteredNotifications = notifications;
  if (filter === 'unread') filteredNotifications = notifications.filter(n => !n.is_read);
  if (filter === 'read') filteredNotifications = notifications.filter(n => n.is_read);
  
  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE));
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * NOTIFICATIONS_PER_PAGE,
    page * NOTIFICATIONS_PER_PAGE
  );

  // Ensure page is valid after filtering
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  // Segmented control component with improved dark theme styling
  const NotificationFilter = () => (
    <div className="flex w-full max-w-xs mx-auto rounded-lg overflow-hidden border border-[#2A2F38] bg-[#151821] mb-8">
      <button
        className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
          filter === 'all' 
            ? 'bg-accent text-white' 
            : 'bg-[#151821] text-gray-300 hover:bg-[#1A1D23]'
        }`}
        onClick={() => { setFilter('all'); setPage(1); }}
      >
        All
      </button>
      <button
        className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#2A2F38] ${
          filter === 'unread' 
            ? 'bg-accent text-white' 
            : 'bg-[#151821] text-gray-300 hover:bg-[#1A1D23]'
        }`}
        onClick={() => { setFilter('unread'); setPage(1); }}
      >
        <div className="flex items-center justify-center gap-1.5">
          <Bell size={14} />
          <span>Unread {unreadCount > 0 && `(${unreadCount})`}</span>
        </div>
      </button>
      <button
        className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#2A2F38] ${
          filter === 'read' 
            ? 'bg-accent text-white' 
            : 'bg-[#151821] text-gray-300 hover:bg-[#1A1D23]'
        }`}
        onClick={() => { setFilter('read'); setPage(1); }}
      >
        <div className="flex items-center justify-center gap-1.5">
          <CheckCheck size={14} />
          <span>Read</span>
        </div>
      </button>
    </div>
  );
  
  // Loading state component
  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 size={40} className="text-accent animate-spin mb-4" />
      <p className="text-gray-300 text-center">Loading notifications...</p>
    </div>
  );
  
  // Error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-16 bg-[#1A1D23] rounded-xl border border-[#2A2F38]">
      <AlertCircle size={40} className="text-red-400 mb-4" />
      <p className="text-gray-300 text-center font-medium">{error}</p>
      <button 
        className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        onClick={() => fetchNotifications()}
      >
        Try Again
      </button>
    </div>
  );
  
  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-10">
      <BellOff size={isMobile ? 40 : 56} className="text-gray-600 mb-3" />
      <p className="text-gray-400 text-center font-medium">No notifications found</p>
      <p className="text-gray-500 text-sm text-center mt-1">
        {filter === 'unread' ? 'You have read all your notifications.' : 
         filter === 'read' ? 'No read notifications yet.' : 'You have no notifications.'}
      </p>
      {!hasNotifications && (
        <p className="text-blue-400 text-sm text-center mt-4 max-w-md">
          Notifications will appear here when there are lottery results, draws, or other important updates.
        </p>
      )}
    </div>
  );
  
  // Success message for mark all as read
  const SuccessMessage = () => (
    <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-4 py-3 rounded-lg flex items-center shadow-lg">
      <CheckCircle2 size={20} className="mr-2" />
      <span>All notifications marked as read!</span>
    </div>
  );
      
  // Mobile Layout with dark theme
  const MobileNotificationsScreen = () => (
    <div className="min-h-screen bg-primary notification-screen">
      <main className="px-4 py-6">
        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className="text-white font-bold text-xl">Notifications</h2>
          {unreadCount > 0 && (
            <button
              className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-full"
              onClick={handleMarkAllAsRead}
              disabled={loading}
            >
              Mark All Read
            </button>
          )}
        </div>
        
        <NotificationFilter />
        
        {loading && !paginatedNotifications.length ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : paginatedNotifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {paginatedNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`rounded-xl p-4 bg-[#1A1D23] border ${
                  !notification.is_read 
                    ? 'border-accent/30 shadow-[0_0_8px_rgba(228,0,43,0.1)]' 
                    : 'border-[#2A2F38]'
                }`}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
              >
                {markingAsRead === notification.id ? (
                  <div className="flex justify-center py-6">
                    <Loader2 size={24} className="text-accent animate-spin" />
                  </div>
                ) : (
                  <NotificationItem
                    type={notification.type || 'reminder'}
                    title={notification.title}
                    message={notification.description}
                    time={notification.time_ago || new Date(notification.created_at).toLocaleDateString()}
                    isUnread={!notification.is_read}
                    subtitle={notification.subtitle}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Improved Pagination Controls for Mobile */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              className={`p-2.5 rounded-lg border ${
                page === 1 
                  ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                  : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
              }`}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ArrowLeft size={16} />
            </button>
            
            <div className="px-4 py-1.5 bg-[#151821] border border-[#2A2F38] rounded-lg">
              <span className="text-gray-300 text-sm font-medium">
                {page} / {totalPages}
              </span>
            </div>
            
            <button
              className={`p-2.5 rounded-lg border ${
                page === totalPages 
                  ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                  : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
              }`}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </main>
      
      {markAllSuccess && <SuccessMessage />}
    </div>
  );

  // Desktop Layout with dark theme
  const DesktopNotificationsScreen = () => (
    <div className="min-h-screen bg-primary notification-screen">
      <main className="pt-10 pb-16 px-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-white font-bold text-3xl mb-2">Notifications</h2>
            <p className="text-gray-400">
              Stay updated with lottery results, reminders, and smart picks
            </p>
          </div>
          
        </div>
        
        <NotificationFilter />
        
        {loading && !paginatedNotifications.length ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : paginatedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#1A1D23] rounded-2xl border border-[#2A2F38]">
            <BellOff size={56} className="text-gray-600 mb-4" />
            <p className="text-gray-300 text-xl font-medium text-center">No notifications found</p>
            <p className="text-gray-500 text-center mt-2 max-w-md">
              {filter === 'unread' ? 'You have read all your notifications.' : 
                filter === 'read' ? 'No read notifications yet.' : 'You have no notifications.'}
            </p>
            {!hasNotifications && (
              <p className="text-blue-400 text-sm text-center mt-6 max-w-md">
                Your notifications for lottery results, upcoming draws, and Smart Pick suggestions will appear here.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedNotifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`rounded-xl p-5 bg-[#1A1D23] border ${
                  !notification.is_read 
                    ? 'border-accent/30 shadow-[0_0_15px_rgba(228,0,43,0.1)]' 
                    : 'border-[#2A2F38]'
                } transition-all duration-300 hover:shadow-lg cursor-pointer`}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
              >
                {markingAsRead === notification.id ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={32} className="text-accent animate-spin" />
                  </div>
                ) : (
                  <NotificationItem
                    type={notification.type || 'reminder'}
                    title={notification.title}
                    message={notification.description}
                    time={notification.time_ago || new Date(notification.created_at).toLocaleDateString()}
                    isUnread={!notification.is_read}
                    subtitle={notification.subtitle}
                  />
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Improved Pagination Controls for Desktop */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border ${
                page === 1 
                  ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                  : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
              }`}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ArrowLeft size={18} />
              <span>Previous</span>
            </button>
            
            <div className="flex items-center">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  className={`w-10 h-10 mx-1 rounded-lg font-medium transition-colors ${
                    page === i + 1
                      ? 'bg-accent text-white'
                      : 'bg-[#151821] text-gray-400 hover:bg-[#1A1D23] border border-[#2A2F38]'
                  }`}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border ${
                page === totalPages 
                  ? 'border-gray-700 bg-[#151821] text-gray-600 cursor-not-allowed' 
                  : 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors'
              }`}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <span>Next</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </main>
      
      {markAllSuccess && <SuccessMessage />}
    </div>
  );

  return isMobile ? <MobileNotificationsScreen /> : <DesktopNotificationsScreen />;
};

export default NotificationsScreen;