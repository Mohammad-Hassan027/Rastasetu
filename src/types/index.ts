export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  profilePicture?: string;
  bio?: string;
  followers: number;
  following: number;
  points: number;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  content: string;
  images: string[];
  location?: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  likes: number;
  comments: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
}

export interface Place {
  id: string;
  name: string;
  description: string;
  images: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
  rating: number;
  reviews: number;
  category: string;
  address: string;
}

export interface Coupon {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  discount: string;
  validUntil: string;
  termsAndConditions: string[];
  isRedeemed?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface CreatePostData {
  content: string;
  images?: string[];
  location?: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  MainTabs: undefined;
  CreatePost: undefined;
  PostDetails: { postId: string };
  Profile: { userId: string };
  PlaceDetails: { placeId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Profile: undefined;
  Coupons: undefined;
};