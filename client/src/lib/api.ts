import axios from 'axios';

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

export function setAccessToken(token: string | null): void {
  accessTokenMemory = token;
}

export function getAccessToken(): string | null {
  return accessTokenMemory;
}

apiClient.interceptors.request.use((config) => {
  if (accessTokenMemory && config.headers) {
    config.headers.Authorization = `Bearer ${accessTokenMemory}`;
  }
  return config;
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiErr = error.response?.data?.error;
    if (apiErr?.details && Array.isArray(apiErr.details) && apiErr.details.length > 0) {
      return apiErr.details.map((d: { message: string }) => d.message).join(', ');
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
