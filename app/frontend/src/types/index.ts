// Row Status State Machine
export type RowStatus = 'pending' | 'valid' | 'invalid' | 'submitting' | 'success' | 'failed';

// Case Row Data
export interface CaseRow {
    _id?: string;
    case_id: string;
    applicant_name: string;
    dob: string;
    email?: string;
    phone?: string;
    category: 'TAX' | 'LICENSE' | 'PERMIT';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    [key: string]: string | undefined;
}

// Validation Error
export interface ValidationError {
    field: string;
    message: string;
    value?: string;
    suggestion?: string;
}

// Schema Field Definition
export interface SchemaField {
    name: string;
    label: string;
    required: boolean;
    type: 'string' | 'email' | 'phone' | 'date' | 'enum';
    enumValues?: string[];
    validation?: (value: string) => string | null;
}

// Column Mapping
export interface ColumnMapping {
    csvColumn: string;
    schemaField: string;
    confidence: number;
}

// Case (from API)
export interface Case {
    id: string;
    caseId: string;
    applicantName: string;
    dob: string;
    email?: string;
    phone?: string;
    category: 'TAX' | 'LICENSE' | 'PERMIT';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
    };
}

// Import Job
export interface ImportJob {
    id: string;
    fileName: string;
    totalRows: number;
    processedRows: number;
    successCount: number;
    failedCount: number;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
    createdAt: string;
    updatedAt: string;
}

// Audit Log Entry
export interface AuditLogEntry {
    id: string;
    action: string;
    changes: Record<string, { old: unknown; new: unknown }>;
    createdAt: string;
    user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
    };
}

// Note
export interface Note {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
    };
}

// Pagination
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        hasNextPage: boolean;
        nextCursor?: string;
    };
}

// Analytics
export interface Analytics {
    totalCases: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    recentImports: ImportJob[];
}
