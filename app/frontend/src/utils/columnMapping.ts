/**
 * Smart Column Auto-Mapping Utility
 * Uses fuzzy matching to automatically map CSV headers to schema fields
 */

// Required schema fields for case import
export const SCHEMA_FIELDS = {
    case_id: {
        label: 'Case ID',
        required: true,
        aliases: ['caseid', 'case_number', 'case_no', 'id', 'case', 'reference', 'ref'],
    },
    applicant_name: {
        label: 'Applicant Name',
        required: true,
        aliases: ['name', 'applicant', 'full_name', 'fullname', 'person', 'client', 'customer'],
    },
    dob: {
        label: 'Date of Birth',
        required: true,
        aliases: ['date_of_birth', 'dateofbirth', 'birth_date', 'birthdate', 'birthday', 'born'],
    },
    email: {
        label: 'Email',
        required: false,
        aliases: ['email_address', 'emailaddress', 'e-mail', 'mail'],
    },
    phone: {
        label: 'Phone',
        required: false,
        aliases: ['phone_number', 'phonenumber', 'telephone', 'tel', 'mobile', 'cell', 'contact'],
    },
    category: {
        label: 'Category',
        required: true,
        aliases: ['type', 'case_type', 'casetype', 'cat', 'classification'],
    },
    priority: {
        label: 'Priority',
        required: false,
        aliases: ['prio', 'urgency', 'importance', 'level'],
    },
} as const;

export type SchemaField = keyof typeof SCHEMA_FIELDS;

export interface ColumnMapping {
    csvColumn: string;
    schemaField: SchemaField | null;
    confidence: number; // 0-1
    isAutoMapped: boolean;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function similarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (s1 === s2) return 1;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1;

    // Check for substring match
    if (longer.includes(shorter) || shorter.includes(longer)) {
        return 0.9;
    }

    const distance = levenshteinDistance(s1, s2);
    return 1 - distance / Math.max(s1.length, s2.length);
}

/**
 * Find the best matching schema field for a CSV column header
 */
function findBestMatch(
    csvHeader: string,
    availableFields: SchemaField[]
): { field: SchemaField | null; confidence: number } {
    let bestMatch: SchemaField | null = null;
    let bestConfidence = 0;

    const normalizedHeader = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const field of availableFields) {
        const schema = SCHEMA_FIELDS[field];

        // Check exact match with field name
        const fieldSimilarity = similarity(csvHeader, field);
        if (fieldSimilarity > bestConfidence) {
            bestConfidence = fieldSimilarity;
            bestMatch = field;
        }

        // Check exact match with label
        const labelSimilarity = similarity(csvHeader, schema.label);
        if (labelSimilarity > bestConfidence) {
            bestConfidence = labelSimilarity;
            bestMatch = field;
        }

        // Check against aliases
        for (const alias of schema.aliases) {
            const aliasSimilarity = similarity(csvHeader, alias);
            if (aliasSimilarity > bestConfidence) {
                bestConfidence = aliasSimilarity;
                bestMatch = field;
            }
        }
    }

    // Only return matches with confidence >= 0.6
    if (bestConfidence >= 0.6) {
        return { field: bestMatch, confidence: bestConfidence };
    }

    return { field: null, confidence: 0 };
}

/**
 * Auto-map CSV columns to schema fields
 */
export function autoMapColumns(csvHeaders: string[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    const usedFields = new Set<SchemaField>();

    // First pass: find high-confidence matches
    const candidates: Array<{
        csvColumn: string;
        field: SchemaField | null;
        confidence: number;
    }> = [];

    for (const header of csvHeaders) {
        const availableFields = (Object.keys(SCHEMA_FIELDS) as SchemaField[]).filter(
            (f) => !usedFields.has(f)
        );
        const { field, confidence } = findBestMatch(header, availableFields);
        candidates.push({ csvColumn: header, field, confidence });
    }

    // Sort by confidence (descending) to assign best matches first
    const sortedCandidates = [...candidates].sort(
        (a, b) => b.confidence - a.confidence
    );

    // Assign fields, avoiding duplicates
    for (const candidate of sortedCandidates) {
        if (candidate.field && !usedFields.has(candidate.field)) {
            usedFields.add(candidate.field);
            const idx = candidates.findIndex((c) => c.csvColumn === candidate.csvColumn);
            candidates[idx] = candidate;
        } else {
            const idx = candidates.findIndex((c) => c.csvColumn === candidate.csvColumn);
            if (candidates[idx].field && usedFields.has(candidates[idx].field!)) {
                candidates[idx] = { ...candidate, field: null, confidence: 0 };
            }
        }
    }

    // Build final mappings
    for (const candidate of candidates) {
        if (candidate.field && usedFields.has(candidate.field)) {
            mappings.push({
                csvColumn: candidate.csvColumn,
                schemaField: candidate.field,
                confidence: candidate.confidence,
                isAutoMapped: true,
            });
        } else {
            mappings.push({
                csvColumn: candidate.csvColumn,
                schemaField: null,
                confidence: 0,
                isAutoMapped: false,
            });
        }
    }

    return mappings;
}

/**
 * Get unmapped required fields
 */
export function getUnmappedRequiredFields(mappings: ColumnMapping[]): string[] {
    const mappedFields = new Set(
        mappings.filter((m) => m.schemaField).map((m) => m.schemaField)
    );

    return (Object.keys(SCHEMA_FIELDS) as SchemaField[])
        .filter((field) => SCHEMA_FIELDS[field].required && !mappedFields.has(field))
        .map((field) => SCHEMA_FIELDS[field].label);
}

/**
 * Get confidence level class name
 */
export function getConfidenceLevel(
    confidence: number
): 'high' | 'medium' | 'low' {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'low';
    return 'medium';
}

/**
 * Apply column mapping to transform CSV data
 */
export function applyMapping<T extends Record<string, unknown>>(
    data: T[],
    mappings: ColumnMapping[]
): Record<string, unknown>[] {
    return data.map((row) => {
        const transformedRow: Record<string, unknown> = {};

        for (const mapping of mappings) {
            if (mapping.schemaField) {
                transformedRow[mapping.schemaField] = row[mapping.csvColumn];
            }
        }

        return transformedRow;
    });
}
