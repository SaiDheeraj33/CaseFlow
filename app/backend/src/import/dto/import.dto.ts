import {
    IsString,
    IsInt,
    IsArray,
    ValidateNested,
    IsOptional,
    IsEmail,
    IsEnum,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Category, Priority } from '@prisma/client';

export class CreateImportJobDto {
    @ApiProperty()
    @IsString()
    fileName: string;

    @ApiProperty()
    @IsInt()
    @Min(1)
    totalRows: number;
}

export class ImportRowDto {
    @ApiProperty()
    @IsString()
    caseId: string;

    @ApiProperty()
    @IsString()
    applicantName: string;

    @ApiProperty()
    @IsString()
    dob: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ enum: Category })
    @IsEnum(Category)
    category: Category;

    @ApiPropertyOptional({ enum: Priority })
    @IsOptional()
    @IsEnum(Priority)
    priority?: Priority;
}

export class BatchImportDto {
    @ApiProperty({ type: [ImportRowDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ImportRowDto)
    rows: ImportRowDto[];

    @ApiProperty({ description: 'Starting index of this batch in the original file' })
    @IsInt()
    @Min(0)
    startIndex: number;
}
