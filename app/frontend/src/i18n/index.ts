import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            // Navigation
            'nav.upload': 'Upload CSV',
            'nav.validate': 'Validate & Fix',
            'nav.cases': 'Cases',
            'nav.analytics': 'Analytics',
            'nav.history': 'Import History',
            'nav.logout': 'Logout',

            // Auth
            'auth.login': 'Sign In',
            'auth.register': 'Create Account',
            'auth.email': 'Email',
            'auth.password': 'Password',
            'auth.magicLink': 'Send Magic Link',
            'auth.magicLinkSent': 'Magic link sent to your email',
            'auth.orContinueWith': 'Or continue with',

            // Upload
            'upload.title': 'Upload CSV File',
            'upload.dropzone': 'Drag & drop your CSV file here, or click to browse',
            'upload.supported': 'Supports CSV files up to 50,000 rows',
            'upload.processing': 'Processing file...',

            // Column Mapping
            'mapping.title': 'Map Columns',
            'mapping.csvColumn': 'CSV Column',
            'mapping.schemaField': 'Schema Field',
            'mapping.confidence': 'Confidence',
            'mapping.unmapped': 'Unmapped',
            'mapping.required': 'Required',

            // Validation
            'validation.title': 'Validate & Fix Data',
            'validation.valid': 'Valid',
            'validation.errors': 'Errors',
            'validation.warnings': 'Warnings',
            'validation.fixAll': 'Fix All',
            'validation.fixSelected': 'Fix Selected',
            'validation.errorSummary': 'Error Summary',

            // Fix Helpers
            'fix.trimWhitespace': 'Trim Whitespace',
            'fix.titleCase': 'Title Case Names',
            'fix.normalizePhone': 'Normalize Phone',
            'fix.defaultPriority': 'Set Default Priority',

            // Submit
            'submit.title': 'Submit Cases',
            'submit.inProgress': 'Submitting...',
            'submit.success': 'Successfully imported',
            'submit.failed': 'Failed to import',
            'submit.retry': 'Retry Failed',
            'submit.downloadErrors': 'Download Error Report',

            // Cases
            'cases.title': 'Cases',
            'cases.search': 'Search cases...',
            'cases.filter': 'Filter',
            'cases.noResults': 'No cases found',
            'cases.loading': 'Loading cases...',

            // Status
            'status.pending': 'Pending',
            'status.valid': 'Valid',
            'status.invalid': 'Invalid',
            'status.submitting': 'Submitting',
            'status.success': 'Success',
            'status.failed': 'Failed',

            // Priority
            'priority.low': 'Low',
            'priority.medium': 'Medium',
            'priority.high': 'High',

            // Category
            'category.tax': 'Tax',
            'category.license': 'License',
            'category.permit': 'Permit',

            // Common
            'common.save': 'Save',
            'common.cancel': 'Cancel',
            'common.delete': 'Delete',
            'common.edit': 'Edit',
            'common.loading': 'Loading...',
            'common.error': 'An error occurred',
            'common.success': 'Success',
            'common.confirm': 'Confirm',
            'common.back': 'Back',
            'common.next': 'Next',
            'common.previous': 'Previous',
            'common.of': 'of',
            'common.rows': 'rows',

            // Keyboard Shortcuts
            'shortcuts.title': 'Keyboard Shortcuts',
            'shortcuts.help': 'Show this help',
            'shortcuts.save': 'Save / Submit',
            'shortcuts.undo': 'Undo',
            'shortcuts.redo': 'Redo',
            'shortcuts.search': 'Focus search',
            'shortcuts.escape': 'Close dialog / Cancel',
        },
    },
};

export function initI18n() {
    i18n.use(initReactI18next).init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });
}

export default i18n;
