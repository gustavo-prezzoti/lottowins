import api from './api';

export interface Notification {
  id: number;
  title: string;
  subtitle?: string;
  description: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  // Custom fields for UI
  type?: 'win' | 'reminder' | 'smart-pick';
  time_ago?: string;
}

export interface NotificationsResponse {
  count: number;
  results: Notification[];
  has_notifications: boolean;
  unread_count: number;
}

export interface MarkAsReadResponse {
  message: string;
  notification: Notification;
  success: boolean;
}

export interface NotificationDetailResponse {
  notification: Notification;
}

class NotificationService {
  /**
   * Get all notifications
   */
  async getNotifications(): Promise<NotificationsResponse> {
    try {
      const response = await api.get<NotificationsResponse>('/lottery/notifications/');
      
      // Add time_ago and type fields for UI if not present in API
      const results = response.data.results.map(notification => {
        // Create a formatted time ago string if not provided by API
        if (!notification.time_ago) {
          notification.time_ago = this.formatTimeAgo(notification.created_at);
        }
        
        // Determine notification type if not provided
        if (!notification.type) {
          notification.type = this.determineNotificationType(notification);
        }
        
        return notification;
      });
      
      return {
        ...response.data,
        results
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  /**
   * Mark a notification as read
   * @param id The notification ID to mark as read
   */
  async markAsRead(id: number): Promise<MarkAsReadResponse> {
    try {
      const response = await api.patch<MarkAsReadResponse>(`/lottery/notifications/${id}/mark_as_read/`);
      return response.data;
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{success: boolean; message: string}> {
    try {
      const response = await api.patch<{success: boolean; message: string}>('/lottery/notifications/mark_all_as_read/');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Get a single notification by ID
   * @param id The notification ID
   */
  async getNotificationById(id: number): Promise<NotificationDetailResponse> {
    try {
      const response = await api.get<NotificationDetailResponse>(`/lottery/notifications/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching notification details for ID ${id}:`, error);
      throw new Error('Failed to fetch notification details');
    }
  }

  /**
   * Format a date string into a relative time string
   */
  private formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Determine notification type based on content
   */
  private determineNotificationType(notification: Notification): 'win' | 'reminder' | 'smart-pick' {
    const title = notification.title.toLowerCase();
    const description = notification.description.toLowerCase();
    
    if (title.includes('win') || title.includes('prize') || description.includes('win') || description.includes('prize')) {
      return 'win';
    } else if (title.includes('smart pick') || description.includes('smart pick') || description.includes('generated')) {
      return 'smart-pick';
    } else {
      return 'reminder';
    }
  }
}

export default new NotificationService(); 