import { z } from 'zod';
import type { CaseRow, ValidationError } from '../types';

// Validation schema
const caseSchema = z.object({
    case_id: z.string().min(1, 'Case ID is required'),
    applicant_name: z.string().min(1, 'Applicant name is required'),
    dob: z.string()
        .min(1, 'Date of birth is required')
        .refine((date) => {
            const d = new Date(date);
            if (isNaN(d.getTime())) return false;
            const year = d.getFullYear();
            return year >= 1900 && year <= new Date().getFullYear();
        }, 'Invalid date (must be between 1900 and today)'),
    email: z.string()
        .optional()
        .refine((email) => {
            if (!email) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }, 'Invalid email format'),
    phone: z.string()
        .optional()
        .refine((phone) => {
            if (!phone) return true;
            return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/[\s()-]/g, ''));
        }, 'Invalid phone format (use E.164)'),
    category: z.enum(['TAX', 'LICENSE', 'PERMIT'], {
        errorMap: () => ({ message: 'Category must be TAX, LICENSE, or PERMIT' }),
    }),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('LOW'),
});

export function validateRow(row: CaseRow): ValidationError[] {
    const errors: ValidationError[] = [];

    try {
        caseSchema.parse(row);
    } catch (error) {
        if (error instanceof z.ZodError) {
            for (const issue of error.issues) {
                const field = issue.path[0] as string;
                const value = row[field as keyof CaseRow];

                errors.push({
                    field,
                    message: issue.message,
                    value: typeof value === 'string' ? value : undefined,
                    suggestion: getSuggestion(field, value),
                });
            }
        }
    }

    return errors;
}

export function validateAllRows(rows: CaseRow[]): Map<string, ValidationError[]> {
    const errorsMap = new Map<string, ValidationError[]>();
    const seenCaseIds = new Set<string>();

    for (const row of rows) {
        const rowId = row._id || '';
        const errors = validateRow(row);

        // Check for duplicates within file
        if (row.case_id) {
            if (seenCaseIds.has(row.case_id)) {
                errors.push({
                    field: 'case_id',
                    message: 'Duplicate case ID in file',
                    value: row.case_id,
                });
            }
            seenCaseIds.add(row.case_id);
        }

        if (errors.length > 0) {
            errorsMap.set(rowId, errors);
        }
    }

    return errorsMap;
}

function getSuggestion(field: string, value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;

    switch (field) {
        case 'applicant_name':
            if (value.includes('  ')) {
                return value.replace(/\s+/g, ' ').trim();
            }
            break;
        case 'phone':
            // Try to normalize phone
            const cleaned = value.replace(/[\s()-]/g, '');
            if (cleaned.match(/^\d{10}$/)) {
                return `+91${cleaned}`; // Assume India if 10 digits
            }
            break;
        case 'category':
            const upper = value.toUpperCase();
            if (['TAX', 'LICENSE', 'PERMIT'].includes(upper)) {
                return upper;
            }
            break;
        case 'priority':
            const upperPriority = value.toUpperCase();
            if (['LOW', 'MEDIUM', 'HIGH'].includes(upperPriority)) {
                return upperPriority;
            }
            if (!value) return 'LOW';
            break;
    }

    return undefined;
}

// Fix helpers
export const fixHelpers = {
    trimWhitespace: (value: string) => value.replace(/\s+/g, ' ').trim(),

    titleCase: (value: string) =>
        value
            .toLowerCase()
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),

    normalizePhone: (value: string) => {
        const cleaned = value.replace(/[\s()-]/g, '');
        if (cleaned.match(/^\d{10}$/)) {
            return `+91${cleaned}`;
        }
        if (cleaned.match(/^\d{11,}$/)) {
            return `+${cleaned}`;
        }
        return value;
    },

    defaultPriority: (value: string) => (value ? value.toUpperCase() : 'LOW'),

    upperCase: (value: string) => value.toUpperCase(),
};
