import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Case, CaseStatus, Category, Priority } from '@prisma/client';

export interface PaginatedCases {
    data: Case[];
    meta: {
        total: number;
        hasNextPage: boolean;
        nextCursor?: string;
    };
}

export interface CaseFilters {
    status?: CaseStatus;
    category?: Category;
    priority?: Priority;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    userId?: string;
}

@Injectable()
export class CasesService {
    constructor(private readonly prisma: PrismaService) { }

    // ============================================
    // GET CASES (Cursor-based pagination)
    // ============================================
    async findAll(
        filters: CaseFilters,
        cursor?: string,
        limit: number = 20,
    ): Promise<PaginatedCases> {
        const where: Prisma.CaseWhereInput = {};

        if (filters.status) where.status = filters.status;
        if (filters.category) where.category = filters.category;
        if (filters.priority) where.priority = filters.priority;
        if (filters.userId) where.userId = filters.userId;

        if (filters.search) {
            where.OR = [
                { caseId: { contains: filters.search, mode: 'insensitive' } },
                { applicantName: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        if (filters.startDate || filters.endDate) {
            where.createdAt = {};
            if (filters.startDate) where.createdAt.gte = filters.startDate;
            if (filters.endDate) where.createdAt.lte = filters.endDate;
        }

        const cases = await this.prisma.case.findMany({
            where,
            take: limit + 1,
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });

        const hasNextPage = cases.length > limit;
        const data = hasNextPage ? cases.slice(0, -1) : cases;
        const nextCursor = hasNextPage ? data[data.length - 1]?.id : undefined;

        const total = await this.prisma.case.count({ where });

        return {
            data,
            meta: {
                total,
                hasNextPage,
                nextCursor,
            },
        };
    }

    // ============================================
    // GET SINGLE CASE
    // ============================================
    async findOne(id: string) {
        const caseData = await this.prisma.case.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
                auditLogs: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: { id: true, email: true, firstName: true, lastName: true },
                        },
                    },
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: {
                            select: { id: true, email: true, firstName: true, lastName: true },
                        },
                    },
                },
            },
        });

        if (!caseData) {
            throw new NotFoundException('Case not found');
        }

        return caseData;
    }

    // ============================================
    // UPDATE CASE
    // ============================================
    async update(
        id: string,
        data: Prisma.CaseUpdateInput,
        userId: string,
    ) {
        const existingCase = await this.prisma.case.findUnique({ where: { id } });

        if (!existingCase) {
            throw new NotFoundException('Case not found');
        }

        // Build changes for audit log
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        const updateData = data as Record<string, unknown>;

        for (const key of Object.keys(updateData)) {
            const existingValue = (existingCase as Record<string, unknown>)[key];
            if (existingValue !== updateData[key]) {
                changes[key] = { old: existingValue, new: updateData[key] };
            }
        }

        // Update case and create audit log in transaction
        const [updatedCase] = await this.prisma.$transaction([
            this.prisma.case.update({
                where: { id },
                data,
            }),
            this.prisma.auditLog.create({
                data: {
                    action: 'UPDATE',
                    changes,
                    caseId: id,
                    userId,
                },
            }),
        ]);

        return updatedCase;
    }

    // ============================================
    // ADD NOTE
    // ============================================
    async addNote(caseId: string, content: string, userId: string) {
        const existingCase = await this.prisma.case.findUnique({ where: { id: caseId } });

        if (!existingCase) {
            throw new NotFoundException('Case not found');
        }

        const [note] = await this.prisma.$transaction([
            this.prisma.note.create({
                data: {
                    content,
                    caseId,
                    userId,
                },
            }),
            this.prisma.auditLog.create({
                data: {
                    action: 'NOTE_ADDED',
                    changes: { note: { content } },
                    caseId,
                    userId,
                },
            }),
        ]);

        return note;
    }

    // ============================================
    // CHECK DUPLICATES (for import)
    // ============================================
    async checkDuplicates(caseIds: string[]): Promise<string[]> {
        const existing = await this.prisma.case.findMany({
            where: { caseId: { in: caseIds } },
            select: { caseId: true },
        });

        return existing.map((c) => c.caseId);
    }

    // ============================================
    // GET ANALYTICS
    // ============================================
    async getAnalytics(userId?: string) {
        const where: Prisma.CaseWhereInput = userId ? { userId } : {};

        const [
            totalCases,
            statusCounts,
            categoryCounts,
            priorityCounts,
            recentImports,
        ] = await Promise.all([
            this.prisma.case.count({ where }),
            this.prisma.case.groupBy({
                by: ['status'],
                where,
                _count: true,
            }),
            this.prisma.case.groupBy({
                by: ['category'],
                where,
                _count: true,
            }),
            this.prisma.case.groupBy({
                by: ['priority'],
                where,
                _count: true,
            }),
            this.prisma.importJob.findMany({
                where: userId ? { userId } : {},
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    fileName: true,
                    totalRows: true,
                    successCount: true,
                    failedCount: true,
                    status: true,
                    createdAt: true,
                },
            }),
        ]);

        return {
            totalCases,
            byStatus: Object.fromEntries(statusCounts.map((s) => [s.status, s._count])),
            byCategory: Object.fromEntries(categoryCounts.map((c) => [c.category, c._count])),
            byPriority: Object.fromEntries(priorityCounts.map((p) => [p.priority, p._count])),
            recentImports,
        };
    }
}
