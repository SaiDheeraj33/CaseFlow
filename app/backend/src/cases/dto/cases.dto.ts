import {
    IsOptional,
    IsString,
    IsEnum,
    IsInt,
    Min,
    Max,
    IsArray,
    IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CaseStatus, Category, Priority } from '@prisma/client';

export class GetCasesDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ enum: CaseStatus })
    @IsOptional()
    @IsEnum(CaseStatus)
    status?: CaseStatus;

    @ApiPropertyOptional({ enum: Category })
    @IsOptional()
    @IsEnum(Category)
    category?: Category;

    @ApiPropertyOptional({ enum: Priority })
    @IsOptional()
    @IsEnum(Priority)
    priority?: Priority;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

export class UpdateCaseDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    applicantName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    dob?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ enum: Category })
    @IsOptional()
    @IsEnum(Category)
    category?: Category;

    @ApiPropertyOptional({ enum: Priority })
    @IsOptional()
    @IsEnum(Priority)
    priority?: Priority;

    @ApiPropertyOptional({ enum: CaseStatus })
    @IsOptional()
    @IsEnum(CaseStatus)
    status?: CaseStatus;
}

export class AddNoteDto {
    @ApiProperty()
    @IsString()
    content: string;
}

export class CheckDuplicatesDto {
    @ApiProperty({ type: [String] })
    @IsArray()
    @IsString({ each: true })
    caseIds: string[];
}
