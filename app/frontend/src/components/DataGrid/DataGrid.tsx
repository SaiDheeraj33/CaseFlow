import { useMemo, useState, useRef, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { CaseRow, RowStatus, ValidationError } from '../../types';
import { useImportStore } from '../../store/importStore';
import './DataGrid.css';

interface DataGridProps {
    data: CaseRow[];
    validationErrors: Map<string, ValidationError[]>;
    rowStatuses: Map<string, RowStatus>;
}

const columnHelper = createColumnHelper<CaseRow>();

const statusEmoji: Record<RowStatus, string> = {
    pending: '⏳',
    valid: '✅',
    invalid: '❌',
    submitting: '🔄',
    success: '✓',
    failed: '✕',
};

export function DataGrid({ data, validationErrors, rowStatuses }: DataGridProps) {
    const { updateCell } = useImportStore();
    const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const columns = useMemo<ColumnDef<CaseRow, unknown>[]>(
        () => [
            columnHelper.display({
                id: 'status',
                header: '',
                size: 50,
                cell: ({ row }) => {
                    const status = rowStatuses.get(row.original._id || '') || 'pending';
                    return (
                        <span className={`status-indicator status-${status}`} title={status}>
                            {statusEmoji[status]}
                        </span>
                    );
                },
            }),
            columnHelper.accessor('case_id', {
                header: 'Case ID',
                size: 120,
            }),
            columnHelper.accessor('applicant_name', {
                header: 'Applicant Name',
                size: 180,
            }),
            columnHelper.accessor('dob', {
                header: 'DOB',
                size: 120,
            }),
            columnHelper.accessor('email', {
                header: 'Email',
                size: 200,
            }),
            columnHelper.accessor('phone', {
                header: 'Phone',
                size: 150,
            }),
            columnHelper.accessor('category', {
                header: 'Category',
                size: 100,
            }),
            columnHelper.accessor('priority', {
                header: 'Priority',
                size: 100,
            }),
        ],
        [rowStatuses],
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 44,
        overscan: 10,
    });

    const handleCellEdit = useCallback(
        (rowId: string, field: string, value: string) => {
            updateCell(rowId, field, value);
            setEditingCell(null);
        },
        [updateCell],
    );

    const getCellErrors = (rowId: string, field: string): ValidationError | undefined => {
        const rowErrors = validationErrors.get(rowId);
        return rowErrors?.find((e) => e.field === field);
    };

    return (
        <div className="data-grid-container" ref={tableContainerRef}>
            <table className="data-grid" role="grid" aria-label="CSV Data Grid">
                <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id} role="row">
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    role="columnheader"
                                    style={{ width: header.getSize() }}
                                    aria-sort="none"
                                >
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = rows[virtualRow.index];
                        const rowId = row.original._id || '';
                        const rowErrors = validationErrors.get(rowId);
                        const hasErrors = rowErrors && rowErrors.length > 0;

                        return (
                            <tr
                                key={row.id}
                                role="row"
                                className={hasErrors ? 'row-error' : ''}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    display: 'flex',
                                }}
                            >
                                {row.getVisibleCells().map((cell) => {
                                    const field = cell.column.id;
                                    const cellError = getCellErrors(rowId, field);
                                    const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;
                                    const isEditable = field !== 'status';

                                    return (
                                        <td
                                            key={cell.id}
                                            role="gridcell"
                                            className={`
                        ${cellError ? 'cell-error' : ''}
                        ${isEditable ? 'cell-editable' : ''}
                      `}
                                            style={{
                                                width: cell.column.getSize(),
                                                minWidth: cell.column.getSize(),
                                            }}
                                            onClick={() => {
                                                if (isEditable && !isEditing) {
                                                    setEditingCell({ rowId, field });
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && isEditable) {
                                                    setEditingCell({ rowId, field });
                                                }
                                            }}
                                            tabIndex={isEditable ? 0 : -1}
                                            aria-describedby={cellError ? `error-${rowId}-${field}` : undefined}
                                        >
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    className="cell-input"
                                                    defaultValue={String(cell.getValue() || '')}
                                                    autoFocus
                                                    onBlur={(e) => handleCellEdit(rowId, field, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCellEdit(rowId, field, e.currentTarget.value);
                                                        } else if (e.key === 'Escape') {
                                                            setEditingCell(null);
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    {cellError && (
                                                        <span
                                                            className="cell-error-indicator"
                                                            id={`error-${rowId}-${field}`}
                                                            title={cellError.message}
                                                        >
                                                            ⚠️
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
