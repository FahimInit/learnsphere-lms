import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessTokenMemory: string | null = null;
let onSessionRefreshCallback:
  | ((token: string | null) => void)
  | null = null;

export function setAccessToken(token: string | null): void {
  accessTokenMemory = token;
}

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

export function registerSessionRefreshListener(
  listener: (token: string | null) => void
): void {
  onSessionRefreshCallback = listener;
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessTokenMemory && config.headers) {
    config.headers.Authorization = `Bearer ${accessTokenMemory}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processPendingQueue(error: unknown, token: string | null = null): void {
  pendingQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken: string = refreshRes.data?.data?.accessToken;
        setAccessToken(newAccessToken);
        onSessionRefreshCallback?.(newAccessToken);
        processPendingQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        onSessionRefreshCallback?.(null);
        processPendingQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiErr = error.response?.data?.error;
    if (
      apiErr?.details &&
      Array.isArray(apiErr.details) &&
      apiErr.details.length > 0
    ) {
      return apiErr.details
        .map((d: { message: string }) => d.message)
        .join(', ');
    }
    if (apiErr?.message) {
      return apiErr.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
