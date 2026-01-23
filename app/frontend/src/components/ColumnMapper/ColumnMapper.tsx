import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    autoMapColumns,
    getUnmappedRequiredFields,
    getConfidenceLevel,
    SCHEMA_FIELDS,
    SchemaField,
    ColumnMapping,
} from '@/utils/columnMapping';
import './ColumnMapper.css';

interface ColumnMapperProps {
    csvHeaders: string[];
    onMappingComplete: (mappings: ColumnMapping[]) => void;
    onCancel: () => void;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({
    csvHeaders,
    onMappingComplete,
    onCancel,
}) => {
    const { t } = useTranslation();
    const [mappings, setMappings] = useState<ColumnMapping[]>([]);
    const [unmappedRequired, setUnmappedRequired] = useState<string[]>([]);

    // Auto-map on mount
    useEffect(() => {
        const autoMapped = autoMapColumns(csvHeaders);
        setMappings(autoMapped);
        setUnmappedRequired(getUnmappedRequiredFields(autoMapped));
    }, [csvHeaders]);

    const handleFieldChange = (csvColumn: string, schemaField: string) => {
        setMappings((prev) => {
            // Remove previous mapping for this schema field
            const updated = prev.map((m) => {
                if (m.schemaField === schemaField && m.csvColumn !== csvColumn) {
                    return { ...m, schemaField: null, confidence: 0, isAutoMapped: false };
                }
                if (m.csvColumn === csvColumn) {
                    return {
                        ...m,
                        schemaField: schemaField === '' ? null : (schemaField as SchemaField),
                        confidence: schemaField === '' ? 0 : 1,
                        isAutoMapped: false,
                    };
                }
                return m;
            });
            setUnmappedRequired(getUnmappedRequiredFields(updated));
            return updated;
        });
    };

    const handleAutoMap = () => {
        const autoMapped = autoMapColumns(csvHeaders);
        setMappings(autoMapped);
        setUnmappedRequired(getUnmappedRequiredFields(autoMapped));
    };

    const canProceed = unmappedRequired.length === 0;

    const getMappedFields = (): Set<SchemaField> => {
        return new Set(
            mappings.filter((m) => m.schemaField).map((m) => m.schemaField!)
        );
    };

    return (
        <div className="column-mapper">
            <div className="mapper-header">
                <h3>📊 {t('upload.mapColumns', 'Map CSV Columns')}</h3>
                <button className="auto-map-btn" onClick={handleAutoMap}>
                    ✨ {t('upload.autoMap', 'Auto-Map')}
                </button>
            </div>

            <div className="mapper-grid">
                {mappings.map((mapping) => {
                    const mappedFields = getMappedFields();
                    const confidenceLevel = mapping.confidence > 0
                        ? getConfidenceLevel(mapping.confidence)
                        : 'none';

                    return (
                        <div
                            key={mapping.csvColumn}
                            className={`mapper-row ${!mapping.schemaField ? 'unmapped' : ''}`}
                        >
                            <span className="csv-column">{mapping.csvColumn}</span>
                            <span className="arrow-icon">→</span>
                            <select
                                className="field-select"
                                value={mapping.schemaField || ''}
                                onChange={(e) =>
                                    handleFieldChange(mapping.csvColumn, e.target.value)
                                }
                            >
                                <option value="">
                                    {t('upload.selectField', '-- Select Field --')}
                                </option>
                                {(Object.keys(SCHEMA_FIELDS) as SchemaField[]).map((field) => (
                                    <option
                                        key={field}
                                        value={field}
                                        disabled={
                                            mappedFields.has(field) && mapping.schemaField !== field
                                        }
                                    >
                                        {SCHEMA_FIELDS[field].label}
                                        {SCHEMA_FIELDS[field].required ? ' *' : ''}
                                    </option>
                                ))}
                            </select>
                            <span className={`confidence-badge ${confidenceLevel}`}>
                                {mapping.confidence > 0
                                    ? `${Math.round(mapping.confidence * 100)}%`
                                    : '—'}
                            </span>
                        </div>
                    );
                })}
            </div>

            {unmappedRequired.length > 0 && (
                <div className="unmapped-warning">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>
                        {t('upload.missingRequired', 'Missing required fields')}:{' '}
                        <strong>{unmappedRequired.join(', ')}</strong>
                    </span>
                </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)' }}>
                <button
                    className="proceed-btn"
                    style={{ background: 'var(--color-muted)', flex: '0 0 auto', width: 'auto' }}
                    onClick={onCancel}
                >
                    ← {t('common.back', 'Back')}
                </button>
                <button
                    className="proceed-btn"
                    disabled={!canProceed}
                    onClick={() => onMappingComplete(mappings)}
                >
                    {t('upload.proceedToValidation', 'Proceed to Validation')} →
                </button>
            </div>
        </div>
    );
};
