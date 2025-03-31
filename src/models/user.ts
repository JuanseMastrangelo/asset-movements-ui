export interface User {
  id: string;
  username: string;
  email: string;
  role: 'VIEWER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: 'VIEWER' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  role?: 'VIEWER' | 'ADMIN' | 'SUPER_ADMIN';
} 