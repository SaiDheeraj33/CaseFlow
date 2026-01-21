import { create } from 'zustand';
import { api } from '../utils/api';
import type { CaseRow, RowStatus, ValidationError } from '../types';

interface ImportState {
    // File & Data
    fileName: string | null;
    rawData: CaseRow[];
    mappedData: CaseRow[];

    // Column Mapping
    columnMapping: Record<string, string>;
    autoMappingConfidence: Record<string, number>;

    // Validation
    validationErrors: Map<string, ValidationError[]>;
    rowStatuses: Map<string, RowStatus>;

    // Import Job
    jobId: string | null;
    isSubmitting: boolean;
    progress: number;
    successCount: number;
    failedCount: number;

    // Actions
    setFile: (fileName: string, data: CaseRow[]) => void;
    setColumnMapping: (mapping: Record<string, string>, confidence: Record<string, number>) => void;
    setMappedData: (data: CaseRow[]) => void;
    setValidationErrors: (errors: Map<string, ValidationError[]>) => void;
    updateRowStatus: (rowId: string, status: RowStatus) => void;
    updateCell: (rowId: string, field: string, value: string) => void;
    applyFix: (rowIds: string[], field: string, fixFn: (value: string) => string) => void;

    // Import
    startImport: () => Promise<string>;
    submitBatch: (rows: CaseRow[], startIndex: number) => Promise<{ success: number; failed: number }>;
    getJobStatus: () => Promise<void>;

    // Reset
    reset: () => void;
}

const initialState = {
    fileName: null,
    rawData: [],
    mappedData: [],
    columnMapping: {},
    autoMappingConfidence: {},
    validationErrors: new Map(),
    rowStatuses: new Map(),
    jobId: null,
    isSubmitting: false,
    progress: 0,
    successCount: 0,
    failedCount: 0,
};

export const useImportStore = create<ImportState>((set, get) => ({
    ...initialState,

    setFile: (fileName, data) => {
        const rowStatuses = new Map<string, RowStatus>();
        data.forEach((row, index) => {
            rowStatuses.set(row._id || `row-${index}`, 'pending');
        });

        set({
            fileName,
            rawData: data,
            mappedData: [],
            rowStatuses,
            validationErrors: new Map(),
        });
    },

    setColumnMapping: (mapping, confidence) => {
        set({
            columnMapping: mapping,
            autoMappingConfidence: confidence,
        });
    },

    setMappedData: (data) => {
        set({ mappedData: data });
    },

    setValidationErrors: (errors) => {
        const rowStatuses = new Map(get().rowStatuses);

        // Update row statuses based on validation
        get().mappedData.forEach((row) => {
            const rowId = row._id || '';
            const hasErrors = errors.has(rowId) && errors.get(rowId)!.length > 0;
            rowStatuses.set(rowId, hasErrors ? 'invalid' : 'valid');
        });

        set({ validationErrors: errors, rowStatuses });
    },

    updateRowStatus: (rowId, status) => {
        const rowStatuses = new Map(get().rowStatuses);
        rowStatuses.set(rowId, status);
        set({ rowStatuses });
    },

    updateCell: (rowId, field, value) => {
        const mappedData = get().mappedData.map((row) => {
            if (row._id === rowId) {
                return { ...row, [field]: value };
            }
            return row;
        });
        set({ mappedData });
    },

    applyFix: (rowIds, field, fixFn) => {
        const mappedData = get().mappedData.map((row) => {
            if (rowIds.includes(row._id || '')) {
                const currentValue = row[field as keyof CaseRow];
                if (typeof currentValue === 'string') {
                    return { ...row, [field]: fixFn(currentValue) };
                }
            }
            return row;
        });
        set({ mappedData });
    },

    startImport: async () => {
        const { fileName, mappedData } = get();

        const response = await api.post('/import/start', {
            fileName: fileName || 'import.csv',
            totalRows: mappedData.length,
        });

        const jobId = response.data.id;
        set({ jobId, isSubmitting: true, progress: 0, successCount: 0, failedCount: 0 });

        return jobId;
    },

    submitBatch: async (rows, startIndex) => {
        const { jobId } = get();
        if (!jobId) throw new Error('No import job started');

        const response = await api.post(`/import/${jobId}/batch`, {
            rows: rows.map((row) => ({
                caseId: row.case_id,
                applicantName: row.applicant_name,
                dob: row.dob,
                email: row.email || undefined,
                phone: row.phone || undefined,
                category: row.category,
                priority: row.priority || 'LOW',
            })),
            startIndex,
        });

        const { success, failed } = response.data;

        // Update row statuses
        const rowStatuses = new Map(get().rowStatuses);
        rows.forEach((row, i) => {
            const rowId = row._id || '';
            const error = response.data.errors?.find((e: { index: number }) => e.index === startIndex + i);
            rowStatuses.set(rowId, error ? 'failed' : 'success');
        });

        set((state) => ({
            rowStatuses,
            successCount: state.successCount + success,
            failedCount: state.failedCount + failed,
            progress: Math.round(((startIndex + rows.length) / state.mappedData.length) * 100),
        }));

        return { success, failed };
    },

    getJobStatus: async () => {
        const { jobId } = get();
        if (!jobId) return;

        const response = await api.get(`/import/${jobId}/status`);
        const { processedRows, totalRows, successCount, failedCount, status } = response.data;

        set({
            progress: Math.round((processedRows / totalRows) * 100),
            successCount,
            failedCount,
            isSubmitting: status === 'PROCESSING',
        });
    },

    reset: () => set(initialState),
}));
