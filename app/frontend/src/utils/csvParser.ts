import Papa from 'papaparse';
import type { CaseRow } from '../types';

export function parseCSV(file: File): Promise<CaseRow[]> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
            complete: (results) => {
                const data = results.data as Record<string, string>[];

                // Add unique IDs to each row
                const rows: CaseRow[] = data.map((row, index) => ({
                    _id: `row-${index}`,
                    case_id: row.case_id || row.caseid || '',
                    applicant_name: row.applicant_name || row.applicantname || row.name || '',
                    dob: row.dob || row.date_of_birth || row.dateofbirth || '',
                    email: row.email || '',
                    phone: row.phone || row.telephone || row.mobile || '',
                    category: (row.category || '').toUpperCase() as CaseRow['category'],
                    priority: (row.priority || 'LOW').toUpperCase() as CaseRow['priority'],
                }));

                resolve(rows);
            },
            error: (error) => {
                reject(error);
            },
        });
    });
}

export function generateErrorCSV(errors: Array<{ index: number; caseId: string; error: string }>): string {
    const headers = ['Row Index', 'Case ID', 'Error'];
    const rows = errors.map((e) => [e.index.toString(), e.caseId, e.error]);

    return Papa.unparse({
        fields: headers,
        data: rows,
    });
}

export function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
