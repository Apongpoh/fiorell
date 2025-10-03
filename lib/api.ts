// API utilities for frontend-backend communication
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Same origin in production
  : '/api'; // Same origin in development (Next.js API routes)

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fiorell_auth_token');
};

// Set auth token in localStorage
const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('fiorell_auth_token', token);
};

// Remove auth token from localStorage
const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('fiorell_auth_token');
};

// Generic API request function
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const token = getAuthToken();
  
  let defaultHeaders: HeadersInit = {};
  // Only set Content-Type if not FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        // Unauthorized - remove invalid token
        removeAuthToken();
        throw errorData.error ? new Error(errorData.error) : new Error('Unauthorized');
      }
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  // User registration
  signup: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    dateOfBirth: string;
    gender: string;
    location: string;
  }) => {
    const response = await apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response;
  },

  // User login
  login: async (credentials: { email: string; password: string }) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      setAuthToken(response.token);
    }
    
    return response;
  },

  // Logout
  logout: () => {
    removeAuthToken();
    window.location.href = '/login';
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return getAuthToken() !== null;
  },
};

// User API calls
export const userAPI = {
  // Delete user account
  deleteAccount: async () => {
    return await apiRequest('/user/profile', {
      method: 'DELETE',
    });
  },
  // Get user profile
  getProfile: async () => {
    return await apiRequest('/user/profile');
  },
  // Record a profile view
  recordProfileView: async (targetUserId: string) => {
    return await apiRequest('/user/profile/view', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  // Get another user's profile
  getUser: async (userId: string) => {
    return await apiRequest(`/user/profile/${userId}`);
  },

  // Like a profile
  likeProfile: async (targetUserId: string) => {
    return await apiRequest('/interactions/likes', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  // Create or get existing match
  createMatch: async (targetUserId: string) => {
    return await apiRequest('/matches', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  },

  // Update user profile
  updateProfile: async (profileData: {
    bio?: string;
    interests?: string[];
    preferences?: {
      ageRange: { min: number; max: number };
      maxDistance: number;
      genderPreference?: string;
      dealBreakers?: {
        requireVerified?: boolean;
        mustHaveInterests?: string[];
        excludeInterests?: string[];
        excludeSmoking?: string[];
        excludeMaritalStatuses?: string[];
        requireHasKids?: boolean | null;
      };
    };
    location?: {
      city: string;
      coordinates?: [number, number];
    };
    lifestyle?: {
      hasKids?: boolean;
      smoking?: 'no' | 'occasionally' | 'yes';
      maritalStatus?: 'single' | 'divorced' | 'widowed' | 'separated';
    };
    privacy?: {
      showAge: boolean;
      showDistance: boolean;
      showOnline: boolean;
    };
  }) => {
    return await apiRequest('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Upload photos
  uploadPhotos: async (files: FileList) => {
    const formData = new FormData();
    Array.from(files).forEach((file, index) => {
      formData.append('photos', file);
    });

    const token = getAuthToken();
    return await fetch(`${API_BASE_URL}/user/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }).then(response => {
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    });
  },

  // Delete photo
  deletePhoto: async (photoId: string) => {
    return await apiRequest(`/user/photos?photoId=${photoId}`, {
      method: 'DELETE',
    });
  },

  // Set main photo
  setMainPhoto: async (photoId: string) => {
    return await apiRequest('/user/photos', {
      method: 'PUT',
      body: JSON.stringify({ photoId }),
    });
  },
};

// Discovery API calls
export const discoveryAPI = {
  // Get potential matches with optional filters
  getMatches: async (
    params: {
      limit?: number;
      offset?: number;
      minAge?: number;
      maxAge?: number;
      gender?: string; // male|female|non-binary|prefer-not-to-say|all
      verifiedOnly?: boolean;
      interests?: string[];
      maxDistance?: number; // km
    } = {}
  ) => {
    const {
      limit = 10,
      offset = 0,
      minAge,
      maxAge,
      gender,
      verifiedOnly,
      interests,
      maxDistance,
    } = params;
    const search = new URLSearchParams();
    search.set('limit', String(limit));
    search.set('offset', String(offset));
    if (minAge !== undefined) search.set('minAge', String(minAge));
    if (maxAge !== undefined) search.set('maxAge', String(maxAge));
    if (gender && gender !== 'all') search.set('gender', gender);
    if (verifiedOnly) search.set('verifiedOnly', 'true');
    if (maxDistance !== undefined) search.set('maxDistance', String(maxDistance));
    if (interests && interests.length) search.set('interests', interests.join(','));
    return await apiRequest(`/discovery/matches?${search.toString()}`);
  },
};

// Interactions API calls
export const interactionsAPI = {
  // Record swipe interaction
  recordSwipe: async (userId: string, targetUserId: string, action: 'like' | 'pass' | 'super_like') => {
    return await apiRequest('/interactions', {
      method: 'POST',
      body: JSON.stringify({ userId, targetUserId, action }),
    });
  },

  // Like or pass a user (legacy method)
  likeUser: async (targetUserId: string, action: 'like' | 'super_like' | 'pass') => {
    return await apiRequest('/interactions/likes', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, action }),
    });
  },

  // Get received likes
  getReceivedLikes: async (limit: number = 20, offset: number = 0) => {
    return await apiRequest(`/interactions/likes?type=received&limit=${limit}&offset=${offset}`);
  },

  // Get sent likes
  getSentLikes: async (limit: number = 20, offset: number = 0) => {
    return await apiRequest(`/interactions/likes?type=sent&limit=${limit}&offset=${offset}`);
  },
};

// Matches API calls
export const matchesAPI = {
  // Get user matches
  getMatches: async (limit: number = 20, offset: number = 0) => {
    return await apiRequest(`/matches?limit=${limit}&offset=${offset}`);
  },

  // Get match details
  getMatchDetails: async (matchId: string) => {
    return await apiRequest(`/matches/${matchId}`);
  },
};

// Messages API calls
export const messagesAPI = {
  // Send message
  sendMessage: async (matchId: string, content: string, type: 'text' | 'image' | 'video' = 'text') => {
    return await apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify({ matchId, content, type }),
    });
  },

  // Get messages for a match
  getMessages: async (matchId: string, limit: number = 50, offset: number = 0) => {
    return await apiRequest(`/messages?matchId=${matchId}&limit=${limit}&offset=${offset}`);
  },

  // Send media message
  sendMediaMessage: async (matchId: string, file: File, type: 'image' | 'video') => {
    const formData = new FormData();
    formData.append('matchId', matchId);
    formData.append('type', type);
    formData.append('media', file);

    const token = getAuthToken();
    return await fetch(`${API_BASE_URL}/messages/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }).then(response => {
      if (!response.ok) throw new Error('Media upload failed');
      return response.json();
    });
  },
};

// Stats API calls
export const statsAPI = {
  // Get user statistics
  getUserStats: async (userId?: string) => {
    if (userId) {
      return await apiRequest(`/stats?userId=${encodeURIComponent(userId)}`);
    }
    return await apiRequest('/stats');
  },
};

// Export utilities
export { getAuthToken, setAuthToken, removeAuthToken };