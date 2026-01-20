import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CasesModule } from './cases/cases.module';
import { ImportModule } from './import/import.module';
import { HealthModule } from './health/health.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Rate limiting
        ThrottlerModule.forRoot([
            {
                ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000,
                limit: parseInt(process.env.THROTTLE_LIMIT || '100'),
            },
        ]),

        // Core modules
        PrismaModule,
        HealthModule,

        // Feature modules
        AuthModule,
        CasesModule,
        ImportModule,
    ],
})
export class AppModule { }
