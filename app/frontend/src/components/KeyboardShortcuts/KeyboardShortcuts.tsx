import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './KeyboardShortcuts.css';

interface KeyboardShortcutsProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Shortcut {
    keys: string[];
    label: string;
}

interface ShortcutSection {
    title: string;
    shortcuts: Shortcut[];
}

const SHORTCUTS: ShortcutSection[] = [
    {
        title: 'General',
        shortcuts: [
            { keys: ['?'], label: 'Show keyboard shortcuts' },
            { keys: ['Escape'], label: 'Close dialog / Cancel' },
            { keys: ['Ctrl', 'K'], label: 'Open command palette' },
        ],
    },
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['G', 'H'], label: 'Go to Home / Upload' },
            { keys: ['G', 'C'], label: 'Go to Cases' },
            { keys: ['G', 'A'], label: 'Go to Analytics' },
            { keys: ['G', 'I'], label: 'Go to Import History' },
        ],
    },
    {
        title: 'Data Grid',
        shortcuts: [
            { keys: ['↑', '↓', '←', '→'], label: 'Navigate cells' },
            { keys: ['Enter'], label: 'Edit cell' },
            { keys: ['Tab'], label: 'Move to next cell' },
            { keys: ['Shift', 'Tab'], label: 'Move to previous cell' },
            { keys: ['Ctrl', 'C'], label: 'Copy selected cells' },
            { keys: ['Ctrl', 'V'], label: 'Paste into cells' },
            { keys: ['Ctrl', 'D'], label: 'Fill down' },
            { keys: ['Ctrl', 'A'], label: 'Select all rows' },
        ],
    },
    {
        title: 'Actions',
        shortcuts: [
            { keys: ['Ctrl', 'S'], label: 'Save / Submit' },
            { keys: ['Ctrl', 'Z'], label: 'Undo' },
            { keys: ['Ctrl', 'Y'], label: 'Redo' },
            { keys: ['Ctrl', 'Shift', 'Z'], label: 'Redo (alternative)' },
            { keys: ['Delete'], label: 'Delete selected rows' },
        ],
    },
    {
        title: 'Filters',
        shortcuts: [
            { keys: ['Ctrl', 'F'], label: 'Focus search' },
            { keys: ['Ctrl', 'Shift', 'F'], label: 'Show only errors' },
        ],
    },
];

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
    isOpen,
    onClose,
}) => {
    const { t } = useTranslation();

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div className="shortcuts-overlay" onClick={onClose}>
            <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
                <div className="shortcuts-header">
                    <h2>⌨️ {t('shortcuts.title', 'Keyboard Shortcuts')}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {SHORTCUTS.map((section) => (
                    <div key={section.title} className="shortcuts-section">
                        <h3>{section.title}</h3>
                        <div className="shortcut-list">
                            {section.shortcuts.map((shortcut, idx) => (
                                <div key={idx} className="shortcut-item">
                                    <span className="shortcut-label">{shortcut.label}</span>
                                    <div className="shortcut-keys">
                                        {shortcut.keys.map((key, keyIdx) => (
                                            <React.Fragment key={keyIdx}>
                                                {keyIdx > 0 && (
                                                    <span className="key-separator">+</span>
                                                )}
                                                <span className="key">{key}</span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="shortcuts-footer">
                    {t(
                        'shortcuts.hint',
                        'Press ? anywhere to toggle this panel'
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Custom hook for global keyboard shortcut handling
 */
export function useKeyboardShortcuts(
    onShortcut: (action: string) => void,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled) return;

        let lastKey = '';
        let lastKeyTime = 0;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            // Always allow ? to show shortcuts
            if (e.key === '?' && !isInput) {
                e.preventDefault();
                onShortcut('showShortcuts');
                return;
            }

            // Skip if in input
            if (isInput) return;

            const now = Date.now();
            const isSequence = now - lastKeyTime < 500;

            // Handle Ctrl+key shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        onShortcut('save');
                        break;
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            onShortcut('redo');
                        } else {
                            onShortcut('undo');
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        onShortcut('redo');
                        break;
                    case 'k':
                        e.preventDefault();
                        onShortcut('commandPalette');
                        break;
                    case 'f':
                        e.preventDefault();
                        if (e.shiftKey) {
                            onShortcut('filterErrors');
                        } else {
                            onShortcut('search');
                        }
                        break;
                    case 'd':
                        e.preventDefault();
                        onShortcut('fillDown');
                        break;
                    case 'a':
                        e.preventDefault();
                        onShortcut('selectAll');
                        break;
                }
                return;
            }

            // Handle g+key navigation sequences
            if (lastKey === 'g' && isSequence) {
                switch (e.key.toLowerCase()) {
                    case 'h':
                        onShortcut('goHome');
                        break;
                    case 'c':
                        onShortcut('goCases');
                        break;
                    case 'a':
                        onShortcut('goAnalytics');
                        break;
                    case 'i':
                        onShortcut('goHistory');
                        break;
                }
            }

            lastKey = e.key.toLowerCase();
            lastKeyTime = now;
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onShortcut, enabled]);
}
