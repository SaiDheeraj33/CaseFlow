import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../utils/api';
import type { Case, AuditLogEntry, Note } from '../types';
import './CaseDetailPage.css';

export function CaseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState<
        (Case & { auditLogs: AuditLogEntry[]; notes: Note[] }) | null
    >(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [isAddingNote, setIsAddingNote] = useState(false);

    useEffect(() => {
        loadCase();
    }, [id]);

    const loadCase = async () => {
        try {
            const response = await api.get<Case & { auditLogs: AuditLogEntry[]; notes: Note[] }>(
                `/cases/${id}`
            );
            setCaseData(response.data);
        } catch (error) {
            toast.error('Case not found');
            navigate('/cases');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsAddingNote(true);
        try {
            await api.post(`/cases/${id}/notes`, { content: newNote });
            setNewNote('');
            loadCase();
            toast.success('Note added');
        } catch {
            toast.error('Failed to add note');
        } finally {
            setIsAddingNote(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="case-detail-loading">
                <div className="skeleton" style={{ height: 200 }} />
            </div>
        );
    }

    if (!caseData) {
        return null;
    }

    return (
        <div className="case-detail-page">
            <button className="btn btn-ghost back-btn" onClick={() => navigate('/cases')}>
                ← Back to Cases
            </button>

            <div className="case-header-card">
                <div className="case-title">
                    <h1>{caseData.caseId}</h1>
                    <span className={`badge badge-status-${caseData.status.toLowerCase()}`}>
                        {caseData.status.replace('_', ' ')}
                    </span>
                </div>
                <div className="case-meta">
                    <span>Created {formatDate(caseData.createdAt)}</span>
                    <span>•</span>
                    <span>By {caseData.user?.email}</span>
                </div>
            </div>

            <div className="case-content">
                <div className="case-info-panel">
                    <div className="card">
                        <h3>Case Information</h3>
                        <dl className="info-grid">
                            <dt>Applicant Name</dt>
                            <dd>{caseData.applicantName}</dd>

                            <dt>Date of Birth</dt>
                            <dd>{new Date(caseData.dob).toLocaleDateString()}</dd>

                            <dt>Email</dt>
                            <dd>{caseData.email || '—'}</dd>

                            <dt>Phone</dt>
                            <dd>{caseData.phone || '—'}</dd>

                            <dt>Category</dt>
                            <dd>
                                <span className={`badge badge-${caseData.category.toLowerCase()}`}>
                                    {caseData.category}
                                </span>
                            </dd>

                            <dt>Priority</dt>
                            <dd>
                                <span className={`badge badge-priority-${caseData.priority.toLowerCase()}`}>
                                    {caseData.priority}
                                </span>
                            </dd>
                        </dl>
                    </div>

                    <div className="card">
                        <h3>Add Note</h3>
                        <form onSubmit={handleAddNote} className="note-form">
                            <textarea
                                className="input note-input"
                                placeholder="Write a note..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                rows={3}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isAddingNote || !newNote.trim()}
                            >
                                {isAddingNote ? 'Adding...' : 'Add Note'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="case-timeline-panel">
                    <div className="card">
                        <h3>Activity Timeline</h3>
                        <div className="timeline">
                            {caseData.notes.map((note) => (
                                <div key={note.id} className="timeline-item note">
                                    <div className="timeline-icon">📝</div>
                                    <div className="timeline-content">
                                        <p className="timeline-text">{note.content}</p>
                                        <span className="timeline-meta">
                                            {note.user.firstName || note.user.email} • {formatDate(note.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {caseData.auditLogs.map((log) => (
                                <div key={log.id} className="timeline-item audit">
                                    <div className="timeline-icon">📋</div>
                                    <div className="timeline-content">
                                        <p className="timeline-text">
                                            <strong>{log.action}</strong>
                                            {log.action === 'UPDATE' && (
                                                <span className="changes">
                                                    {Object.entries(log.changes).map(([field, change]) => (
                                                        <span key={field} className="change-item">
                                                            {field}: {String((change as { old: unknown }).old)} → {String((change as { new: unknown }).new)}
                                                        </span>
                                                    ))}
                                                </span>
                                            )}
                                        </p>
                                        <span className="timeline-meta">
                                            {log.user.firstName || log.user.email} • {formatDate(log.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
