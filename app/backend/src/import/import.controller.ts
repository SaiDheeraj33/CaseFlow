import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImportService } from './import.service';
import { CreateImportJobDto, BatchImportDto } from './dto/import.dto';

@ApiTags('import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
    constructor(private readonly importService: ImportService) { }

    @Post('start')
    @ApiOperation({ summary: 'Start a new import job' })
    @ApiResponse({ status: 201, description: 'Import job created' })
    async startImport(
        @Body() dto: CreateImportJobDto,
        @Req() req: { user: { id: string } },
    ) {
        return this.importService.startImport(dto, req.user.id);
    }

    @Post(':jobId/batch')
    @ApiOperation({ summary: 'Submit a batch of rows for processing' })
    @ApiResponse({ status: 200, description: 'Batch processed' })
    @ApiResponse({ status: 404, description: 'Import job not found' })
    async processBatch(
        @Param('jobId') jobId: string,
        @Body() dto: BatchImportDto,
        @Req() req: { user: { id: string } },
    ) {
        return this.importService.processBatch(jobId, dto, req.user.id);
    }

    @Get(':jobId/status')
    @ApiOperation({ summary: 'Get import job status and progress' })
    @ApiResponse({ status: 200, description: 'Job status' })
    @ApiResponse({ status: 404, description: 'Import job not found' })
    async getStatus(@Param('jobId') jobId: string) {
        return this.importService.getJobStatus(jobId);
    }

    @Post(':jobId/pause')
    @ApiOperation({ summary: 'Pause an import job' })
    @ApiResponse({ status: 200, description: 'Import paused' })
    async pauseImport(@Param('jobId') jobId: string) {
        return this.importService.pauseImport(jobId);
    }

    @Post(':jobId/resume')
    @ApiOperation({ summary: 'Resume a paused import job' })
    @ApiResponse({ status: 200, description: 'Import resumed' })
    async resumeImport(@Param('jobId') jobId: string) {
        return this.importService.resumeImport(jobId);
    }

    @Get(':jobId/errors')
    @ApiOperation({ summary: 'Get error report for an import job' })
    @ApiResponse({ status: 200, description: 'Error report' })
    async getErrorReport(@Param('jobId') jobId: string) {
        return this.importService.getErrorReport(jobId);
    }

    @Get('history')
    @ApiOperation({ summary: 'Get import history for current user' })
    @ApiResponse({ status: 200, description: 'Import history' })
    async getHistory(
        @Req() req: { user: { id: string } },
        @Query('limit') limit?: number,
    ) {
        return this.importService.getHistory(req.user.id, limit);
    }
}
