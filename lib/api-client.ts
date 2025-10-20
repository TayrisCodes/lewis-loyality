/**
 * Frontend API Client Utility
 * Handles authenticated API requests with proper cookie handling
 */

export interface ApiError {
  error: string;
  status: number;
}

export class ApiClient {
  /**
   * Make an authenticated API request
   * Automatically includes credentials (cookies) for authentication
   */
  static async fetch<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Always include cookies
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, create a generic error
        if (!response.ok) {
          const error: ApiError = {
            error: `Request failed with status ${response.status}`,
            status: response.status,
          };
          throw error;
        }
        throw new Error('Failed to parse response');
      }

      if (!response.ok) {
        const error: ApiError = {
          error: data.error || data.message || 'An error occurred',
          status: response.status,
        };
        throw error;
      }

      return data as T;
    } catch (error) {
      // If it's already an ApiError, re-throw it
      if (error && typeof error === 'object' && 'error' in error && 'status' in error) {
        throw error;
      }
      
      // If it's a network error or other error, wrap it properly
      if (error instanceof Error) {
        const apiError: ApiError = {
          error: error.message || 'Network error occurred',
          status: 500,
        };
        throw apiError;
      }
      
      // Fallback for unknown error types
      const apiError: ApiError = {
        error: 'An unexpected error occurred',
        status: 500,
      };
      throw apiError;
    }
  }

  /**
   * GET request
   */
  static async get<T = any>(url: string): Promise<T> {
    return this.fetch<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  static async post<T = any>(url: string, body?: any): Promise<T> {
    return this.fetch<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  static async put<T = any>(url: string, body?: any): Promise<T> {
    return this.fetch<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(url: string): Promise<T> {
    return this.fetch<T>(url, { method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  static async patch<T = any>(url: string, body?: any): Promise<T> {
    return this.fetch<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

/**
 * Auth utility functions for client-side
 */
export const AuthUtils = {
  /**
   * Get stored user role
   */
  getRole(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_role') || sessionStorage.getItem('admin_role');
  },

  /**
   * Get stored user email
   */
  getEmail(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_email') || sessionStorage.getItem('admin_email');
  },

  /**
   * Get stored user name
   */
  getName(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_name') || sessionStorage.getItem('admin_name');
  },

  /**
   * Get stored user ID
   */
  getId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_id') || sessionStorage.getItem('admin_id');
  },

  /**
   * Get stored store ID (for admin users)
   */
  getStoreId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_storeId') || sessionStorage.getItem('admin_storeId');
  },

  /**
   * Check if user is authenticated (has stored user data)
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const role = this.getRole();
    return role !== null;
  },

  /**
   * Check if user is superadmin
   */
  isSuperAdmin(): boolean {
    return this.getRole() === 'superadmin';
  },

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.getRole() === 'admin';
  },

  /**
   * Clear all stored auth data
   */
  clearAuth(): void {
    if (typeof window === 'undefined') return;
    
    // Clear from both localStorage and sessionStorage
    ['admin_role', 'admin_email', 'admin_name', 'admin_id', 'admin_storeId'].forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },

  /**
   * Logout user - clears client-side data and calls logout API
   */
  async logout(): Promise<void> {
    try {
      // Call logout API to clear server-side cookie
      await ApiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Always clear client-side data
      this.clearAuth();
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  },
};

export default ApiClient;




