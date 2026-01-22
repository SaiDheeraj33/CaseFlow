import { useTranslation } from 'react-i18next';
import './ValidationDashboard.css';

interface ValidationDashboardProps {
    totalRows: number;
    validRows: number;
    errorRows: number;
    topErrors: Array<{ field: string; count: number }>;
    isValidating: boolean;
}

export function ValidationDashboard({
    totalRows,
    validRows,
    errorRows,
    topErrors,
    isValidating,
}: ValidationDashboardProps) {
    const { t } = useTranslation();

    const validPercentage = totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0;

    return (
        <div className="validation-dashboard">
            <div className="dashboard-stats">
                <div className="stat-card stat-total">
                    <span className="stat-value">{totalRows.toLocaleString()}</span>
                    <span className="stat-label">Total Rows</span>
                </div>
                <div className="stat-card stat-valid">
                    <span className="stat-value">{validRows.toLocaleString()}</span>
                    <span className="stat-label">{t('validation.valid')}</span>
                    <div className="stat-bar">
                        <div
                            className="stat-bar-fill valid"
                            style={{ width: `${validPercentage}%` }}
                        />
                    </div>
                </div>
                <div className="stat-card stat-errors">
                    <span className="stat-value">{errorRows.toLocaleString()}</span>
                    <span className="stat-label">{t('validation.errors')}</span>
                </div>
            </div>

            {isValidating && (
                <div className="validating-indicator">
                    <span className="animate-spin">⏳</span> Validating...
                </div>
            )}

            {topErrors.length > 0 && (
                <div className="top-errors">
                    <h4>{t('validation.errorSummary')}</h4>
                    <div className="error-chips">
                        {topErrors.map((error) => (
                            <div key={error.field} className="error-chip">
                                <code>{error.field}</code>
                                <span className="error-count">{error.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
