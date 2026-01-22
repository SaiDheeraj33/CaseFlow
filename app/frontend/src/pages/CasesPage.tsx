import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../utils/api';
import type { Case, PaginatedResponse } from '../types';
import './CasesPage.css';

export function CasesPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [cases, setCases] = useState<Case[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [cursor, setCursor] = useState<string | undefined>();
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        loadCases();
    }, [statusFilter]);

    const loadCases = async (newCursor?: string) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (newCursor) params.set('cursor', newCursor);
            if (statusFilter) params.set('status', statusFilter);
            if (search) params.set('search', search);
            params.set('limit', '20');

            const response = await api.get<PaginatedResponse<Case>>(`/cases?${params}`);

            if (newCursor) {
                setCases((prev) => [...prev, ...response.data.data]);
            } else {
                setCases(response.data.data);
            }

            setCursor(response.data.meta.nextCursor);
            setHasMore(response.data.meta.hasNextPage);
        } catch (error) {
            console.error('Failed to load cases', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCursor(undefined);
        loadCases();
    };

    const handleLoadMore = () => {
        if (cursor) {
            loadCases(cursor);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="cases-page">
            <div className="cases-header">
                <h1>{t('cases.title')}</h1>
                <div className="cases-filters">
                    <form onSubmit={handleSearch} className="search-form">
                        <input
                            type="text"
                            className="input search-input"
                            placeholder={t('cases.search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary">
                            🔍
                        </button>
                    </form>
                    <select
                        className="input filter-select"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCursor(undefined);
                        }}
                    >
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            {isLoading && cases.length === 0 ? (
                <div className="cases-loading">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton case-skeleton" />
                    ))}
                </div>
            ) : cases.length === 0 ? (
                <div className="cases-empty">
                    <span className="empty-icon">📁</span>
                    <p>{t('cases.noResults')}</p>
                </div>
            ) : (
                <>
                    <div className="cases-table">
                        <table className="data-grid">
                            <thead>
                                <tr>
                                    <th>Case ID</th>
                                    <th>Applicant</th>
                                    <th>Category</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.map((caseItem) => (
                                    <tr
                                        key={caseItem.id}
                                        onClick={() => navigate(`/cases/${caseItem.id}`)}
                                        className="case-row"
                                    >
                                        <td>
                                            <code>{caseItem.caseId}</code>
                                        </td>
                                        <td>{caseItem.applicantName}</td>
                                        <td>
                                            <span className={`badge badge-${caseItem.category.toLowerCase()}`}>
                                                {caseItem.category}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-priority-${caseItem.priority.toLowerCase()}`}>
                                                {caseItem.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-status-${caseItem.status.toLowerCase()}`}>
                                                {caseItem.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{formatDate(caseItem.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {hasMore && (
                        <div className="load-more">
                            <button
                                className="btn btn-secondary"
                                onClick={handleLoadMore}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
