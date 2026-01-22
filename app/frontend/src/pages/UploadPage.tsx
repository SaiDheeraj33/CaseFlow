import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useImportStore } from '../store/importStore';
import { parseCSV } from '../utils/csvParser';
import './UploadPage.css';

export function UploadPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setFile, fileName } = useImportStore();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a CSV file');
            return;
        }

        try {
            toast.loading('Parsing CSV...', { id: 'parsing' });
            const data = await parseCSV(file);
            toast.dismiss('parsing');

            if (data.length === 0) {
                toast.error('No data found in CSV');
                return;
            }

            setFile(file.name, data);
            toast.success(`Loaded ${data.length.toLocaleString()} rows`);
            navigate('/validate');
        } catch (error) {
            toast.dismiss('parsing');
            toast.error('Failed to parse CSV file');
            console.error(error);
        }
    }, [setFile, navigate]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/csv': ['.csv'] },
        multiple: false,
    });

    return (
        <div className="upload-page">
            <div className="upload-header">
                <h1>{t('upload.title')}</h1>
                <p className="upload-description">
                    Import your case data from a CSV file. We'll help you validate and clean it before submission.
                </p>
            </div>

            <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'dropzone-active' : ''}`}
            >
                <input {...getInputProps()} />
                <div className="dropzone-content">
                    <span className="dropzone-icon">📁</span>
                    <p className="dropzone-text">{t('upload.dropzone')}</p>
                    <p className="dropzone-hint">{t('upload.supported')}</p>
                </div>
            </div>

            {fileName && (
                <div className="upload-current-file">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{fileName}</span>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/validate')}
                    >
                        Continue to Validation →
                    </button>
                </div>
            )}

            <div className="upload-requirements">
                <h3>Required Columns</h3>
                <div className="requirements-grid">
                    <div className="requirement-item">
                        <span className="requirement-badge required">Required</span>
                        <code>case_id</code>
                        <span className="requirement-desc">Unique identifier (e.g., C-1001)</span>
                    </div>
                    <div className="requirement-item">
                        <span className="requirement-badge required">Required</span>
                        <code>applicant_name</code>
                        <span className="requirement-desc">Full name of applicant</span>
                    </div>
                    <div className="requirement-item">
                        <span className="requirement-badge required">Required</span>
                        <code>dob</code>
                        <span className="requirement-desc">Date of birth (ISO format)</span>
                    </div>
                    <div className="requirement-item">
                        <span className="requirement-badge required">Required</span>
                        <code>category</code>
                        <span className="requirement-desc">TAX, LICENSE, or PERMIT</span>
                    </div>
                    <div className="requirement-item">
                        <span className="requirement-badge optional">Optional</span>
                        <code>email</code>
                        <span className="requirement-desc">Valid email address</span>
                    </div>
                    <div className="requirement-item">
                        <span className="requirement-badge optional">Optional</span>
                        <code>phone</code>
                        <span className="requirement-desc">E.164 format (+12025551234)</span>
                    </div>
                    <div className="requirement-item">
                        <span className="requirement-badge optional">Optional</span>
                        <code>priority</code>
                        <span className="requirement-desc">LOW, MEDIUM, or HIGH</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
