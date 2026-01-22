import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ImportJob } from '../types';
import './ImportHistoryPage.css';

export function ImportHistoryPage() {
    const [imports, setImports] = useState<ImportJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const response = await api.get<ImportJob[]>('/import/history?limit=50');
            setImports(response.data);
        } catch (error) {
            console.error('Failed to load import history', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status: ImportJob['status']) => {
        const badges: Record<string, { class: string; label: string }> = {
            PENDING: { class: 'badge-gray', label: 'Pending' },
            PROCESSING: { class: 'badge-primary', label: 'Processing' },
            COMPLETED: { class: 'badge-success', label: 'Completed' },
            FAILED: { class: 'badge-error', label: 'Failed' },
            PAUSED: { class: 'badge-warning', label: 'Paused' },
        };
        return badges[status] || badges.PENDING;
    };

    if (isLoading) {
        return (
            <div className="history-loading">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 80 }} />
                ))}
            </div>
        );
    }

    return (
        <div className="history-page">
            <h1>Import History</h1>

            {imports.length === 0 ? (
                <div className="history-empty">
                    <span className="empty-icon">📜</span>
                    <p>No imports yet</p>
                    <a href="/upload" className="btn btn-primary">
                        Upload your first CSV →
                    </a>
                </div>
            ) : (
                <div className="history-list">
                    {imports.map((job) => {
                        const statusBadge = getStatusBadge(job.status);
                        const successRate = job.totalRows > 0
                            ? Math.round((job.successCount / job.totalRows) * 100)
                            : 0;

                        return (
                            <div key={job.id} className="history-item">
                                <div className="history-icon">📄</div>
                                <div className="history-info">
                                    <h3>{job.fileName}</h3>
                                    <p className="history-meta">
                                        {formatDate(job.createdAt)} • {job.totalRows.toLocaleString()} rows
                                    </p>
                                </div>
                                <div className="history-stats">
                                    <div className="stat">
                                        <span className="stat-value success">{job.successCount}</span>
                                        <span className="stat-label">Success</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value failed">{job.failedCount}</span>
                                        <span className="stat-label">Failed</span>
                                    </div>
                                </div>
                                <div className="history-progress">
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${successRate}%` }}
                                        />
                                    </div>
                                    <span className="progress-label">{successRate}% success</span>
                                </div>
                                <span className={`badge ${statusBadge.class}`}>
                                    {statusBadge.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
