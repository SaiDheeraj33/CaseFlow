import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ImportStatus, Priority, Category } from '@prisma/client';
import { CreateImportJobDto, BatchImportDto, ImportRowDto } from './dto/import.dto';

export interface BatchResult {
    success: number;
    failed: number;
    errors: Array<{
        index: number;
        caseId: string;
        error: string;
    }>;
}

export interface ImportProgress {
    id: string;
    fileName: string;
    status: ImportStatus;
    totalRows: number;
    processedRows: number;
    successCount: number;
    failedCount: number;
    lastProcessedIndex: number;
    progress: number;
}

@Injectable()
export class ImportService {
    constructor(private readonly prisma: PrismaService) { }

    // ============================================
    // START IMPORT JOB
    // ============================================
    async startImport(dto: CreateImportJobDto, userId: string) {
        const job = await this.prisma.importJob.create({
            data: {
                fileName: dto.fileName,
                totalRows: dto.totalRows,
                userId,
                status: ImportStatus.PENDING,
            },
        });

        return {
            id: job.id,
            fileName: job.fileName,
            totalRows: job.totalRows,
            status: job.status,
        };
    }

    // ============================================
    // BATCH IMPORT (Chunked processing)
    // ============================================
    async processBatch(
        jobId: string,
        dto: BatchImportDto,
        userId: string,
    ): Promise<BatchResult> {
        const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });

        if (!job) {
            throw new NotFoundException('Import job not found');
        }

        if (job.status === ImportStatus.COMPLETED || job.status === ImportStatus.FAILED) {
            throw new BadRequestException('Import job already completed or failed');
        }

        // Update to processing if pending
        if (job.status === ImportStatus.PENDING) {
            await this.prisma.importJob.update({
                where: { id: jobId },
                data: { status: ImportStatus.PROCESSING },
            });
        }

        const result: BatchResult = {
            success: 0,
            failed: 0,
            errors: [],
        };

        const caseCreations: Array<{
            caseId: string;
            applicantName: string;
            dob: Date;
            email: string | null;
            phone: string | null;
            category: Category;
            priority: Priority;
            importJobId: string;
            userId: string;
        }> = [];

        // Validate and prepare cases
        for (let i = 0; i < dto.rows.length; i++) {
            const row = dto.rows[i];
            const rowIndex = dto.startIndex + i;

            try {
                // Validate required fields
                if (!row.caseId || !row.applicantName || !row.dob || !row.category) {
                    throw new Error('Missing required fields');
                }

                // Parse date
                const dobDate = new Date(row.dob);
                if (isNaN(dobDate.getTime())) {
                    throw new Error('Invalid date format for dob');
                }

                // Validate category
                if (!Object.values(Category).includes(row.category as Category)) {
                    throw new Error(`Invalid category: ${row.category}`);
                }

                // Default priority to LOW if not provided or invalid
                let priority = Priority.LOW;
                if (row.priority && Object.values(Priority).includes(row.priority as Priority)) {
                    priority = row.priority as Priority;
                }

                caseCreations.push({
                    caseId: row.caseId,
                    applicantName: row.applicantName,
                    dob: dobDate,
                    email: row.email || null,
                    phone: row.phone || null,
                    category: row.category as Category,
                    priority,
                    importJobId: jobId,
                    userId,
                });
            } catch (error) {
                result.failed++;
                result.errors.push({
                    index: rowIndex,
                    caseId: row.caseId || 'unknown',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Bulk create cases (skip duplicates)
        if (caseCreations.length > 0) {
            try {
                // Create cases one by one to handle duplicates gracefully
                for (const caseData of caseCreations) {
                    try {
                        await this.prisma.case.create({ data: caseData });

                        // Create audit log for import
                        await this.prisma.auditLog.create({
                            data: {
                                action: 'IMPORT',
                                changes: { source: job.fileName },
                                caseId: (await this.prisma.case.findUnique({
                                    where: { caseId: caseData.caseId },
                                    select: { id: true }
                                }))!.id,
                                userId,
                            },
                        });

                        result.success++;
                    } catch (error) {
                        result.failed++;
                        result.errors.push({
                            index: dto.startIndex + caseCreations.indexOf(caseData),
                            caseId: caseData.caseId,
                            error: error instanceof Error && error.message.includes('Unique constraint')
                                ? 'Duplicate case ID'
                                : error instanceof Error ? error.message : 'Database error',
                        });
                    }
                }
            } catch (error) {
                // Batch failed completely
                result.failed += caseCreations.length;
            }
        }

        // Update job progress
        const newProcessedRows = job.processedRows + dto.rows.length;
        const newSuccessCount = job.successCount + result.success;
        const newFailedCount = job.failedCount + result.failed;
        const isComplete = newProcessedRows >= job.totalRows;

        await this.prisma.importJob.update({
            where: { id: jobId },
            data: {
                processedRows: newProcessedRows,
                successCount: newSuccessCount,
                failedCount: newFailedCount,
                lastProcessedIndex: dto.startIndex + dto.rows.length - 1,
                status: isComplete ? ImportStatus.COMPLETED : ImportStatus.PROCESSING,
                errorData: result.errors.length > 0
                    ? [...((job.errorData as Array<unknown>) || []), ...result.errors]
                    : job.errorData,
            },
        });

        return result;
    }

    // ============================================
    // GET JOB STATUS
    // ============================================
    async getJobStatus(jobId: string): Promise<ImportProgress> {
        const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });

        if (!job) {
            throw new NotFoundException('Import job not found');
        }

        return {
            id: job.id,
            fileName: job.fileName,
            status: job.status,
            totalRows: job.totalRows,
            processedRows: job.processedRows,
            successCount: job.successCount,
            failedCount: job.failedCount,
            lastProcessedIndex: job.lastProcessedIndex,
            progress: job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0,
        };
    }

    // ============================================
    // PAUSE/RESUME IMPORT
    // ============================================
    async pauseImport(jobId: string) {
        const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });

        if (!job) {
            throw new NotFoundException('Import job not found');
        }

        await this.prisma.importJob.update({
            where: { id: jobId },
            data: { status: ImportStatus.PAUSED },
        });

        return { message: 'Import paused', lastProcessedIndex: job.lastProcessedIndex };
    }

    async resumeImport(jobId: string) {
        const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });

        if (!job) {
            throw new NotFoundException('Import job not found');
        }

        if (job.status !== ImportStatus.PAUSED) {
            throw new BadRequestException('Import is not paused');
        }

        await this.prisma.importJob.update({
            where: { id: jobId },
            data: { status: ImportStatus.PROCESSING },
        });

        return {
            message: 'Import resumed',
            lastProcessedIndex: job.lastProcessedIndex,
            remainingRows: job.totalRows - job.processedRows,
        };
    }

    // ============================================
    // GET IMPORT HISTORY
    // ============================================
    async getHistory(userId: string, limit: number = 20) {
        const jobs = await this.prisma.importJob.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                fileName: true,
                totalRows: true,
                successCount: true,
                failedCount: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return jobs;
    }

    // ============================================
    // GET ERROR REPORT
    // ============================================
    async getErrorReport(jobId: string) {
        const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });

        if (!job) {
            throw new NotFoundException('Import job not found');
        }

        return {
            id: job.id,
            fileName: job.fileName,
            totalRows: job.totalRows,
            successCount: job.successCount,
            failedCount: job.failedCount,
            errors: job.errorData || [],
        };
    }
}
