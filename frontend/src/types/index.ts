export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  interests: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  userId: string | { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  userId?: string;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface GroupedInterestItem {
  interest: string;
  userCount: number;
  users: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export interface UserWithPostsProfile extends User {
  postCount: number;
  posts: Post[];
}
