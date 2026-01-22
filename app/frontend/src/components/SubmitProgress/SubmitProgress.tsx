import './SubmitProgress.css';

interface SubmitProgressProps {
    progress: number;
    successCount: number;
    failedCount: number;
    totalRows: number;
    isSubmitting: boolean;
    onClose: () => void;
    onViewCases: () => void;
}

export function SubmitProgress({
    progress,
    successCount,
    failedCount,
    totalRows,
    isSubmitting,
    onClose,
    onViewCases,
}: SubmitProgressProps) {
    return (
        <div className="submit-progress-overlay">
            <div className="submit-progress-modal">
                <div className="progress-header">
                    <h2>{isSubmitting ? 'Importing Cases...' : 'Import Complete!'}</h2>
                    {!isSubmitting && (
                        <button className="close-btn" onClick={onClose}>×</button>
                    )}
                </div>

                <div className="progress-bar-container">
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="progress-text">{progress}%</span>
                </div>

                <div className="progress-stats">
                    <div className="progress-stat success">
                        <span className="stat-icon">✓</span>
                        <span className="stat-value">{successCount.toLocaleString()}</span>
                        <span className="stat-label">Succeeded</span>
                    </div>
                    <div className="progress-stat failed">
                        <span className="stat-icon">✕</span>
                        <span className="stat-value">{failedCount.toLocaleString()}</span>
                        <span className="stat-label">Failed</span>
                    </div>
                    <div className="progress-stat total">
                        <span className="stat-icon">📊</span>
                        <span className="stat-value">{totalRows.toLocaleString()}</span>
                        <span className="stat-label">Total</span>
                    </div>
                </div>

                {!isSubmitting && (
                    <div className="progress-actions">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                        <button className="btn btn-primary" onClick={onViewCases}>
                            View Cases →
                        </button>
                    </div>
                )}

                {isSubmitting && (
                    <p className="progress-note">
                        Please don't close this window while importing...
                    </p>
                )}
            </div>
        </div>
    );
}
