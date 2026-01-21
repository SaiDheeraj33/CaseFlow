import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../utils/api';

export type Role = 'ADMIN' | 'OPERATOR';

export interface User {
    id: string;
    email: string;
    role: Role;
    firstName?: string;
    lastName?: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
    sendMagicLink: (email: string) => Promise<void>;
    verifyMagicLink: (token: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            login: async (email: string, password: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { accessToken, refreshToken, user } = response.data;

                    localStorage.setItem('refreshToken', refreshToken);

                    set({
                        user,
                        accessToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : 'Login failed';
                    set({ error: message, isLoading: false });
                    throw error;
                }
            },

            register: async (email: string, password: string, firstName?: string, lastName?: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.post('/auth/register', {
                        email,
                        password,
                        firstName,
                        lastName,
                    });
                    const { accessToken, refreshToken, user } = response.data;

                    localStorage.setItem('refreshToken', refreshToken);

                    set({
                        user,
                        accessToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : 'Registration failed';
                    set({ error: message, isLoading: false });
                    throw error;
                }
            },

            sendMagicLink: async (email: string) => {
                set({ isLoading: true, error: null });
                try {
                    await api.post('/auth/magic-link', { email });
                    set({ isLoading: false });
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : 'Failed to send magic link';
                    set({ error: message, isLoading: false });
                    throw error;
                }
            },

            verifyMagicLink: async (token: string) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await api.get(`/auth/magic-link/verify?token=${token}`);
                    const { accessToken, refreshToken, user } = response.data;

                    localStorage.setItem('refreshToken', refreshToken);

                    set({
                        user,
                        accessToken,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : 'Invalid or expired link';
                    set({ error: message, isLoading: false });
                    throw error;
                }
            },

            logout: async () => {
                try {
                    const token = get().accessToken;
                    if (token) {
                        await api.post('/auth/logout', {}, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                    }
                } catch {
                    // Ignore logout errors
                }

                localStorage.removeItem('refreshToken');
                set({
                    user: null,
                    accessToken: null,
                    isAuthenticated: false,
                });
            },

            refreshToken: async () => {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    set({ isAuthenticated: false, user: null, accessToken: null });
                    return;
                }

                try {
                    const response = await api.post('/auth/refresh', { refreshToken });
                    const { accessToken, refreshToken: newRefreshToken, user } = response.data;

                    localStorage.setItem('refreshToken', newRefreshToken);

                    set({
                        user,
                        accessToken,
                        isAuthenticated: true,
                    });
                } catch {
                    localStorage.removeItem('refreshToken');
                    set({
                        user: null,
                        accessToken: null,
                        isAuthenticated: false,
                    });
                }
            },

            clearError: () => set({ error: null }),
        }),
        {
            name: 'caseflow-auth',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                isAuthenticated: state.isAuthenticated,
            }),
        },
    ),
);
