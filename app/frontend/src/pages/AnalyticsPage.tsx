import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Analytics, ImportJob } from '../types';
import './AnalyticsPage.css';

export function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const response = await api.get<Analytics>('/cases/analytics');
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to load analytics', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="analytics-loading">
                <div className="skeleton" style={{ height: 400 }} />
            </div>
        );
    }

    if (!analytics) {
        return <div>Failed to load analytics</div>;
    }

    return (
        <div className="analytics-page">
            <h1>Analytics Dashboard</h1>

            <div className="analytics-grid">
                <div className="analytics-card total-card">
                    <span className="card-icon">📊</span>
                    <span className="card-value">{analytics.totalCases.toLocaleString()}</span>
                    <span className="card-label">Total Cases</span>
                </div>

                <div className="analytics-card">
                    <h3>By Status</h3>
                    <div className="chart-bars">
                        {Object.entries(analytics.byStatus).map(([status, count]) => (
                            <div key={status} className="bar-item">
                                <div className="bar-label">{status.replace('_', ' ')}</div>
                                <div className="bar-track">
                                    <div
                                        className={`bar-fill status-${status.toLowerCase()}`}
                                        style={{
                                            width: `${(count / analytics.totalCases) * 100}%`,
                                        }}
                                    />
                                </div>
                                <div className="bar-value">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="analytics-card">
                    <h3>By Category</h3>
                    <div className="pie-chart">
                        {Object.entries(analytics.byCategory).map(([category, count]) => (
                            <div key={category} className="pie-legend-item">
                                <span className={`pie-dot cat-${category.toLowerCase()}`} />
                                <span className="pie-label">{category}</span>
                                <span className="pie-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="analytics-card">
                    <h3>By Priority</h3>
                    <div className="priority-stats">
                        {Object.entries(analytics.byPriority).map(([priority, count]) => (
                            <div key={priority} className={`priority-item priority-${priority.toLowerCase()}`}>
                                <span className="priority-label">{priority}</span>
                                <span className="priority-value">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="analytics-card recent-imports">
                    <h3>Recent Imports</h3>
                    <div className="imports-list">
                        {analytics.recentImports.length === 0 ? (
                            <p className="no-imports">No imports yet</p>
                        ) : (
                            analytics.recentImports.slice(0, 5).map((job) => (
                                <ImportItem key={job.id} job={job} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ImportItem({ job }: { job: ImportJob }) {
    const successRate = job.totalRows > 0
        ? Math.round((job.successCount / job.totalRows) * 100)
        : 0;

    return (
        <div className="import-item">
            <div className="import-info">
                <span className="import-name">{job.fileName}</span>
                <span className="import-date">
                    {new Date(job.createdAt).toLocaleDateString()}
                </span>
            </div>
            <div className="import-stats">
                <span className="import-success">✓ {job.successCount}</span>
                <span className="import-failed">✕ {job.failedCount}</span>
                <div className="import-progress">
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${successRate}%` }} />
                    </div>
                    <span className="progress-text">{successRate}%</span>
                </div>
            </div>
        </div>
    );
}
