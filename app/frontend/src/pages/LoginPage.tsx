import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import './LoginPage.css';

export function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, register, sendMagicLink, verifyMagicLink, isLoading, error, isAuthenticated, clearError } = useAuthStore();

    const [mode, setMode] = useState<'login' | 'register' | 'magic'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [magicLinkSent, setMagicLinkSent] = useState(false);

    // Handle magic link verification
    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            verifyMagicLink(token)
                .then(() => {
                    toast.success('Successfully logged in!');
                    navigate('/');
                })
                .catch(() => {
                    toast.error('Invalid or expired magic link');
                });
        }
    }, [searchParams, verifyMagicLink, navigate]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    // Clear error on mode change
    useEffect(() => {
        clearError();
    }, [mode, clearError]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (mode === 'login') {
                await login(email, password);
                toast.success('Welcome back!');
                navigate('/');
            } else if (mode === 'register') {
                await register(email, password, firstName, lastName);
                toast.success('Account created successfully!');
                navigate('/');
            } else if (mode === 'magic') {
                await sendMagicLink(email);
                setMagicLinkSent(true);
                toast.success('Magic link sent to your email!');
            }
        } catch {
            // Error is handled by the store
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="logo-icon">📋</span>
                        <h1 className="logo-text">CaseFlow</h1>
                    </div>
                    <p className="login-subtitle">Import → Validate → Fix → Submit → Track</p>
                </div>

                <div className="login-card">
                    <div className="login-tabs">
                        <button
                            className={`login-tab ${mode === 'login' ? 'active' : ''}`}
                            onClick={() => setMode('login')}
                        >
                            {t('auth.login')}
                        </button>
                        <button
                            className={`login-tab ${mode === 'register' ? 'active' : ''}`}
                            onClick={() => setMode('register')}
                        >
                            {t('auth.register')}
                        </button>
                    </div>

                    {magicLinkSent ? (
                        <div className="magic-link-sent">
                            <span className="magic-link-icon">✉️</span>
                            <h3>Check your email</h3>
                            <p>We sent a magic link to <strong>{email}</strong></p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setMagicLinkSent(false)}
                            >
                                Use different email
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="login-form">
                            {error && <div className="error-banner">{error}</div>}

                            {mode === 'register' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="label" htmlFor="firstName">First Name</label>
                                        <input
                                            id="firstName"
                                            type="text"
                                            className="input"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="label" htmlFor="lastName">Last Name</label>
                                        <input
                                            id="lastName"
                                            type="text"
                                            className="input"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="label" htmlFor="email">{t('auth.email')}</label>
                                <input
                                    id="email"
                                    type="email"
                                    className="input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            {mode !== 'magic' && (
                                <div className="form-group">
                                    <label className="label" htmlFor="password">{t('auth.password')}</label>
                                    <input
                                        id="password"
                                        type="password"
                                        className="input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg login-submit"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="animate-spin">⏳</span>
                                ) : mode === 'login' ? (
                                    t('auth.login')
                                ) : mode === 'register' ? (
                                    t('auth.register')
                                ) : (
                                    t('auth.magicLink')
                                )}
                            </button>

                            <div className="login-divider">
                                <span>{t('auth.orContinueWith')}</span>
                            </div>

                            <button
                                type="button"
                                className="btn btn-secondary magic-link-btn"
                                onClick={() => {
                                    if (mode === 'magic') {
                                        setMode('login');
                                    } else {
                                        setMode('magic');
                                    }
                                }}
                            >
                                {mode === 'magic' ? '← Back to password login' : '✨ ' + t('auth.magicLink')}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
