import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { RegisterDto, LoginDto, MagicLinkDto } from './dto/auth.dto';
import { Role } from '@prisma/client';

export interface JwtPayload {
    sub: string;
    email: string;
    role: Role;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        role: Role;
        firstName?: string;
        lastName?: string;
    };
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
    ) { }

    // ============================================
    // REGISTER
    // ============================================
    async register(dto: RegisterDto): Promise<TokenResponse> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                password: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: dto.role || Role.OPERATOR,
            },
        });

        return this.generateTokens(user);
    }

    // ============================================
    // LOGIN
    // ============================================
    async login(dto: LoginDto): Promise<TokenResponse> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (!user || !user.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        return this.generateTokens(user);
    }

    // ============================================
    // MAGIC LINK
    // ============================================
    async sendMagicLink(dto: MagicLinkDto): Promise<{ message: string }> {
        const email = dto.email.toLowerCase();

        // Find or create user
        let user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
            user = await this.prisma.user.create({
                data: { email, role: Role.OPERATOR },
            });
        }

        // Generate magic token
        const magicToken = uuidv4();
        const magicExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await this.prisma.user.update({
            where: { id: user.id },
            data: { magicToken, magicExpiry },
        });

        // Send email
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');
        const magicLink = `${frontendUrl}/auth/magic?token=${magicToken}`;

        await this.mailService.sendMagicLinkEmail(email, magicLink);

        return { message: 'Magic link sent to your email' };
    }

    async verifyMagicLink(token: string): Promise<TokenResponse> {
        const user = await this.prisma.user.findUnique({
            where: { magicToken: token },
        });

        if (!user || !user.magicExpiry) {
            throw new BadRequestException('Invalid or expired magic link');
        }

        if (new Date() > user.magicExpiry) {
            throw new BadRequestException('Magic link has expired');
        }

        // Clear magic token
        await this.prisma.user.update({
            where: { id: user.id },
            data: { magicToken: null, magicExpiry: null },
        });

        return this.generateTokens(user);
    }

    // ============================================
    // REFRESH TOKEN
    // ============================================
    async refreshTokens(refreshToken: string): Promise<TokenResponse> {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user || user.refreshToken !== refreshToken) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            return this.generateTokens(user);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // ============================================
    // LOGOUT
    // ============================================
    async logout(userId: string): Promise<{ message: string }> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });

        return { message: 'Logged out successfully' };
    }

    // ============================================
    // HELPER: Generate Tokens
    // ============================================
    private async generateTokens(user: {
        id: string;
        email: string;
        role: Role;
        firstName?: string | null;
        lastName?: string | null;
    }): Promise<TokenResponse> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload);

        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
        });

        // Store refresh token
        await this.prisma.user.update({
            where: { id: user.id },
            data: { refreshToken },
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName || undefined,
                lastName: user.lastName || undefined,
            },
        };
    }

    // ============================================
    // HELPER: Validate User (for JWT Strategy)
    // ============================================
    async validateUser(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }
}
