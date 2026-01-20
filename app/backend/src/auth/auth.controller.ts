import {
    Controller,
    Post,
    Body,
    Get,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService, TokenResponse } from './auth.service';
import { RegisterDto, LoginDto, MagicLinkDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'User registered successfully' })
    @ApiResponse({ status: 409, description: 'Email already registered' })
    async register(@Body() dto: RegisterDto): Promise<TokenResponse> {
        return this.authService.register(dto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto): Promise<TokenResponse> {
        return this.authService.login(dto);
    }

    @Post('magic-link')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send magic link to email' })
    @ApiResponse({ status: 200, description: 'Magic link sent' })
    async sendMagicLink(@Body() dto: MagicLinkDto): Promise<{ message: string }> {
        return this.authService.sendMagicLink(dto);
    }

    @Get('magic-link/verify')
    @ApiOperation({ summary: 'Verify magic link token' })
    @ApiResponse({ status: 200, description: 'Token verified, user logged in' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async verifyMagicLink(@Query('token') token: string): Promise<TokenResponse> {
        return this.authService.verifyMagicLink(token);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed' })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponse> {
        return this.authService.refreshTokens(dto.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@Req() req: { user: { id: string } }): Promise<{ message: string }> {
        return this.authService.logout(req.user.id);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile' })
    async getProfile(@Req() req: { user: { id: string; email: string; role: string } }) {
        return req.user;
    }
}
