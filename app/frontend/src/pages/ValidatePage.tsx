import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useImportStore } from '../store/importStore';
import { validateAllRows, fixHelpers } from '../utils/validation';
import { DataGrid } from '../components/DataGrid/DataGrid';
import { ValidationDashboard } from '../components/ValidationDashboard/ValidationDashboard';
import { SubmitProgress } from '../components/SubmitProgress/SubmitProgress';
import './ValidatePage.css';

export function ValidatePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        rawData,
        mappedData,
        setMappedData,
        validationErrors,
        setValidationErrors,
        rowStatuses,
        applyFix,
        startImport,
        submitBatch,
        isSubmitting,
        progress,
        successCount,
        failedCount,
        reset,
    } = useImportStore();

    const [isValidating, setIsValidating] = useState(false);
    const [showSubmitProgress, setShowSubmitProgress] = useState(false);

    // Redirect if no data
    useEffect(() => {
        if (rawData.length === 0) {
            navigate('/upload');
        } else if (mappedData.length === 0) {
            // Auto-map data on first load
            setMappedData(rawData);
        }
    }, [rawData, mappedData, navigate, setMappedData]);

    // Validate on data change
    useEffect(() => {
        if (mappedData.length > 0) {
            setIsValidating(true);
            // Use setTimeout to not block UI for large datasets
            setTimeout(() => {
                const errors = validateAllRows(mappedData);
                setValidationErrors(errors);
                setIsValidating(false);
            }, 0);
        }
    }, [mappedData, setValidationErrors]);

    const handleApplyFix = (fixType: keyof typeof fixHelpers, field: string) => {
        const rowIds = mappedData.map((row) => row._id || '');
        applyFix(rowIds, field, fixHelpers[fixType]);
        toast.success(`Applied ${fixType} to ${field}`);
    };

    const handleSubmit = async () => {
        // Check for validation errors
        if (validationErrors.size > 0) {
            const proceed = window.confirm(
                `There are ${validationErrors.size} rows with errors. Submit anyway? (only valid rows will be imported)`
            );
            if (!proceed) return;
        }

        setShowSubmitProgress(true);

        try {
            await startImport();

            // Get valid rows only
            const validRows = mappedData.filter((row) => {
                const status = rowStatuses.get(row._id || '');
                return status !== 'invalid';
            });

            // Submit in batches of 100
            const batchSize = 100;
            for (let i = 0; i < validRows.length; i += batchSize) {
                const batch = validRows.slice(i, i + batchSize);
                await submitBatch(batch, i);
            }

            toast.success(`Import complete! ${successCount} succeeded, ${failedCount} failed`);

            // Request browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('CaseFlow Import Complete', {
                    body: `${successCount} cases imported successfully`,
                    icon: '/favicon.svg',
                });
            }
        } catch (error) {
            toast.error('Import failed');
            console.error(error);
        }
    };

    const handleReset = () => {
        reset();
        navigate('/upload');
    };

    const errorCount = validationErrors.size;
    const validCount = mappedData.length - errorCount;

    return (
        <div className="validate-page">
            <div className="validate-header">
                <div className="validate-title-section">
                    <h1>{t('validation.title')}</h1>
                    <p className="validate-subtitle">
                        {mappedData.length.toLocaleString()} rows loaded
                    </p>
                </div>

                <div className="validate-actions">
                    <button className="btn btn-secondary" onClick={handleReset}>
                        ← Upload New File
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting || mappedData.length === 0}
                    >
                        {isSubmitting ? 'Submitting...' : `Submit ${validCount.toLocaleString()} Valid Rows →`}
                    </button>
                </div>
            </div>

            <ValidationDashboard
                totalRows={mappedData.length}
                validRows={validCount}
                errorRows={errorCount}
                topErrors={getTopErrors(validationErrors)}
                isValidating={isValidating}
            />

            <div className="fix-toolbar">
                <span className="fix-toolbar-label">Quick Fixes:</span>
                <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleApplyFix('trimWhitespace', 'applicant_name')}
                >
                    ✂️ {t('fix.trimWhitespace')}
                </button>
                <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleApplyFix('titleCase', 'applicant_name')}
                >
                    Aa {t('fix.titleCase')}
                </button>
                <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleApplyFix('normalizePhone', 'phone')}
                >
                    📞 {t('fix.normalizePhone')}
                </button>
                <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleApplyFix('defaultPriority', 'priority')}
                >
                    ⬆️ {t('fix.defaultPriority')}
                </button>
            </div>

            <DataGrid
                data={mappedData}
                validationErrors={validationErrors}
                rowStatuses={rowStatuses}
            />

            {showSubmitProgress && (
                <SubmitProgress
                    progress={progress}
                    successCount={successCount}
                    failedCount={failedCount}
                    totalRows={mappedData.length}
                    isSubmitting={isSubmitting}
                    onClose={() => setShowSubmitProgress(false)}
                    onViewCases={() => navigate('/cases')}
                />
            )}
        </div>
    );
}

function getTopErrors(errors: Map<string, Array<{ field: string; message: string }>>): Array<{ field: string; count: number }> {
    const fieldCounts = new Map<string, number>();

    errors.forEach((rowErrors) => {
        rowErrors.forEach((error) => {
            const current = fieldCounts.get(error.field) || 0;
            fieldCounts.set(error.field, current + 1);
        });
    });

    return Array.from(fieldCounts.entries())
        .map(([field, count]) => ({ field, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
}
