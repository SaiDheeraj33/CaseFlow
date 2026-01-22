import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../hooks/useTheme';
import './Layout.css';

export function Layout() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { theme, toggleTheme } = useTheme();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">
                        <span className="logo-icon">📋</span>
                        <span className="logo-text">CaseFlow</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/upload" className="nav-item">
                        <span className="nav-icon">📤</span>
                        <span>{t('nav.upload')}</span>
                    </NavLink>
                    <NavLink to="/validate" className="nav-item">
                        <span className="nav-icon">✅</span>
                        <span>{t('nav.validate')}</span>
                    </NavLink>
                    <NavLink to="/cases" className="nav-item">
                        <span className="nav-icon">📁</span>
                        <span>{t('nav.cases')}</span>
                    </NavLink>
                    <NavLink to="/analytics" className="nav-item">
                        <span className="nav-icon">📊</span>
                        <span>{t('nav.analytics')}</span>
                    </NavLink>
                    <NavLink to="/history" className="nav-item">
                        <span className="nav-icon">🕐</span>
                        <span>{t('nav.history')}</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>

                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="user-details">
                            <span className="user-name">
                                {user?.firstName || user?.email?.split('@')[0]}
                            </span>
                            <span className="user-role">{user?.role}</span>
                        </div>
                    </div>

                    <button className="btn btn-ghost logout-btn" onClick={handleLogout}>
                        {t('nav.logout')}
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
