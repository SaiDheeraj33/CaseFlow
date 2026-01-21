const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiError {
    message: string;
    statusCode: number;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getAuthHeader(): Record<string, string> {
        const stored = localStorage.getItem('caseflow-auth');
        if (stored) {
            try {
                const { state } = JSON.parse(stored);
                if (state?.accessToken) {
                    return { Authorization: `Bearer ${state.accessToken}` };
                }
            } catch {
                // Ignore parse errors
            }
        }
        return {};
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        options?: RequestInit,
    ): Promise<{ data: T; status: number }> {
        const url = `${this.baseUrl}${path}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...(options?.headers as Record<string, string> || {}),
        };

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            ...options,
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const error = data as ApiError;
            throw new Error(error.message || `Request failed with status ${response.status}`);
        }

        return { data: data as T, status: response.status };
    }

    async get<T>(path: string, options?: RequestInit) {
        return this.request<T>('GET', path, undefined, options);
    }

    async post<T>(path: string, body?: unknown, options?: RequestInit) {
        return this.request<T>('POST', path, body, options);
    }

    async patch<T>(path: string, body?: unknown, options?: RequestInit) {
        return this.request<T>('PATCH', path, body, options);
    }

    async delete<T>(path: string, options?: RequestInit) {
        return this.request<T>('DELETE', path, undefined, options);
    }
}

export const api = new ApiClient(API_URL);
