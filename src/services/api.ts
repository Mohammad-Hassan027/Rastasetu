import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  Post,
  Place,
  Coupon,
  AuthResponse,
  LoginCredentials,
  SignupData,
  CreatePostData,
  Comment,
  ApiResponse,
} from '@/types';

const BASE_URL = 'http://localhost:3000/api'; // Replace with your backend URL

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, logout user
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('currentUser');
          // You can add navigation logic here to redirect to login
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/login', credentials);
    return response.data.data;
  }

  async signup(userData: SignupData): Promise<AuthResponse> {
    const response: AxiosResponse<ApiResponse<AuthResponse>> = await this.api.post('/auth/signup', userData);
    return response.data.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('currentUser');
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/users/me');
    return response.data.data;
  }

  async getUserProfile(userId: string): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get(`/users/${userId}`);
    return response.data.data;
  }

  async followUser(userId: string): Promise<void> {
    await this.api.post(`/users/${userId}/follow`);
  }

  async unfollowUser(userId: string): Promise<void> {
    await this.api.delete(`/users/${userId}/follow`);
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put('/users/me', userData);
    return response.data.data;
  }

  // Post endpoints
  async getFeed(page: number = 1, limit: number = 10): Promise<Post[]> {
    const response: AxiosResponse<ApiResponse<Post[]>> = await this.api.get('/posts/feed', {
      params: { page, limit },
    });
    return response.data.data;
  }

  async createPost(postData: CreatePostData): Promise<Post> {
    const response: AxiosResponse<ApiResponse<Post>> = await this.api.post('/posts', postData);
    return response.data.data;
  }

  async likePost(postId: string): Promise<void> {
    await this.api.post(`/posts/${postId}/like`);
  }

  async unlikePost(postId: string): Promise<void> {
    await this.api.delete(`/posts/${postId}/like`);
  }

  async getPostComments(postId: string): Promise<Comment[]> {
    const response: AxiosResponse<ApiResponse<Comment[]>> = await this.api.get(`/posts/${postId}/comments`);
    return response.data.data;
  }

  async addComment(postId: string, content: string): Promise<Comment> {
    const response: AxiosResponse<ApiResponse<Comment>> = await this.api.post(`/posts/${postId}/comments`, {
      content,
    });
    return response.data.data;
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    const response: AxiosResponse<ApiResponse<Post[]>> = await this.api.get(`/users/${userId}/posts`);
    return response.data.data;
  }

  // Places endpoints
  async getPlaces(category?: string, search?: string): Promise<Place[]> {
    const response: AxiosResponse<ApiResponse<Place[]>> = await this.api.get('/places', {
      params: { category, search },
    });
    return response.data.data;
  }

  async getTrendingPlaces(): Promise<Place[]> {
    const response: AxiosResponse<ApiResponse<Place[]>> = await this.api.get('/places/trending');
    return response.data.data;
  }

  async getPlaceDetails(placeId: string): Promise<Place> {
    const response: AxiosResponse<ApiResponse<Place>> = await this.api.get(`/places/${placeId}`);
    return response.data.data;
  }

  // Coupons endpoints
  async getCoupons(): Promise<Coupon[]> {
    const response: AxiosResponse<ApiResponse<Coupon[]>> = await this.api.get('/coupons');
    return response.data.data;
  }

  async redeemCoupon(couponId: string): Promise<void> {
    await this.api.post(`/coupons/${couponId}/redeem`);
  }

  async getUserCoupons(): Promise<Coupon[]> {
    const response: AxiosResponse<ApiResponse<Coupon[]>> = await this.api.get('/coupons/my-coupons');
    return response.data.data;
  }

  // Points endpoints
  async getUserPoints(): Promise<{ points: number }> {
    const response: AxiosResponse<ApiResponse<{ points: number }>> = await this.api.get('/users/me/points');
    return response.data.data;
  }

  // Upload endpoint
  async uploadImage(imageUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    } as any);

    const response: AxiosResponse<ApiResponse<{ url: string }>> = await this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.url;
  }
}

export default new ApiService();