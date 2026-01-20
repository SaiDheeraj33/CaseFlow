import {
    Controller,
    Get,
    Patch,
    Post,
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
    ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CasesService } from './cases.service';
import {
    GetCasesDto,
    UpdateCaseDto,
    AddNoteDto,
    CheckDuplicatesDto,
} from './dto/cases.dto';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CasesController {
    constructor(private readonly casesService: CasesService) { }

    @Get()
    @ApiOperation({ summary: 'Get cases with cursor-based pagination' })
    @ApiQuery({ name: 'cursor', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'priority', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'List of cases' })
    async findAll(@Query() query: GetCasesDto) {
        const { cursor, limit, ...filters } = query;
        return this.casesService.findAll(filters, cursor, limit);
    }

    @Get('analytics')
    @ApiOperation({ summary: 'Get case analytics' })
    @ApiResponse({ status: 200, description: 'Analytics data' })
    async getAnalytics(@Req() req: { user: { id: string } }) {
        return this.casesService.getAnalytics(req.user.id);
    }

    @Post('check-duplicates')
    @ApiOperation({ summary: 'Check for duplicate case IDs in database' })
    @ApiResponse({ status: 200, description: 'List of existing case IDs' })
    async checkDuplicates(@Body() dto: CheckDuplicatesDto) {
        return this.casesService.checkDuplicates(dto.caseIds);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get case details with audit history' })
    @ApiResponse({ status: 200, description: 'Case details' })
    @ApiResponse({ status: 404, description: 'Case not found' })
    async findOne(@Param('id') id: string) {
        return this.casesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a case' })
    @ApiResponse({ status: 200, description: 'Case updated' })
    @ApiResponse({ status: 404, description: 'Case not found' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateCaseDto,
        @Req() req: { user: { id: string } },
    ) {
        return this.casesService.update(id, dto, req.user.id);
    }

    @Post(':id/notes')
    @ApiOperation({ summary: 'Add a note to a case' })
    @ApiResponse({ status: 201, description: 'Note added' })
    @ApiResponse({ status: 404, description: 'Case not found' })
    async addNote(
        @Param('id') id: string,
        @Body() dto: AddNoteDto,
        @Req() req: { user: { id: string } },
    ) {
        return this.casesService.addNote(id, dto.content, req.user.id);
    }
}
