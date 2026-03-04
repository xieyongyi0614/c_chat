// 认证相关工具函数

export interface User {
  id: string;
  email: string;
  username: string;
  phone?: string;
  gender?: number;
}

// 获取存储的 token
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

// 设置 token
export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

// 清除 token
export const clearToken = (): void => {
  localStorage.removeItem('token');
};

// 检查用户是否已登录
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// 获取用户信息（如果需要的话）
export const getUserInfo = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 设置用户信息
export const setUserInfo = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

// 清除用户信息
export const clearUserInfo = (): void => {
  localStorage.removeItem('user');
};

// 登出函数
export const logout = (): void => {
  clearToken();
  clearUserInfo();
};

// 创建带认证头的请求配置
export const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};