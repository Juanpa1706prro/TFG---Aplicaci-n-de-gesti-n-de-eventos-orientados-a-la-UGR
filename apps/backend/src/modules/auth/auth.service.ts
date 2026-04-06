import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/modules/user/user.service';
import { jwtConstants } from './constants';
import * as bcrypt from 'bcrypt';

interface JwtPayload {
  id: number;
  userNumber: number;
}

// ------------------------------------------------------------
// Authentication Service.
// ------------------------------------------------------------
@Injectable()
export class AuthService {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ------------------------------------------------------------
  // Methods.
  // ------------------------------------------------------------

  /**
   * Registers a new user in the system.
   * @param {string} email - The user's email address.
   * @param {string} pass - The user's plain-text password.
   * @returns {Promise<any>} The newly created user entity.
   * @throws {ConflictException} If the email already exists in the database.
   */
  async register(email: string, pass: string) {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(pass, salt);

    // Generate a unique user number
    const randomUserNumber = await this.usersService.generateUniqueUserNumber();

    try {
      // Save the user in the database
      return await this.usersService.create({
        email,
        password: hashedPassword,
        userNumber: randomUserNumber,
      });
    } catch (error) {
      // Catch PostgreSQL unique constraint violation
      if (error.code === '23505') {
        throw new ConflictException('This email is already registered.');
      }
      throw error;
    }
  }

  /**
   * Authenticates a user on the system.
   * @param {string} email - The user's email address.
   * @param {string} pass - The user's plain-text password.
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: any } | null>} An object containing the signed JWT and sanitized user data, or null if credentials are invalid.
   */
  async login(email: string, pass: string) {
    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    // Verify the provided password against the hashed password in the database
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    // Construct the JWT payload using the explicit 'id'
    const payload = {
      id: user.id,
      userNumber: user.userNumber,
    };

    // Sign and generate the Access Token and Refresh Tokens
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    // Store the hashed refresh token in the database.
    await this.updateRefreshTokenHash(user.id, refreshToken);

    // Return the token and sanitized user details
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        userNumber: user.userNumber,
        email: user.email,
      },
    };
  }

  /**
   * Logs out the user by removing their refresh token hash from the database.
   * @param {number} userId - The ID of the user logging out.
   */
  async logout(userId: number) {
    await this.usersService.update(userId, { hashedRefreshToken: null });
  }

  /**
   * Generates a short-lived access token.
   * @param {JwtPayload} payload - The user data to embed in the token.
   * @returns {Promise<string>} The signed JWT access token.
   */
  async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: jwtConstants.accessSecret,
      expiresIn: '30s',
    });
  }

  /**
   * Generates a long-lived refresh token.
   * @param payload - The user data to embed in the refresh token.
   * @returns {Promise<string>} The signed JWT access token.
   */
  async generateRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: '1m', // '7d'
    });
  }

  /**
   * Validates an existing refresh token and generates a fresh pair of tokens.
   * Implements token rotation for enhanced security.
   * @param {number} userId - The ID of the user requesting token refresh.
   * @param {string} rawToken - The raw refresh token provided by the client (from cookie).
   * @returns {Promise<{ accessToken: string, refreshToken: string }>} The new token pair.
   * @throws {ForbiddenException} If the token is invalid, old, or the user is logged out.
   */
  async refreshTokens(userId: number, rawToken: string) {
    const user = await this.usersService.findByID(userId);

    // Deny access if user does not exist or has no refresh token hash (logged out)
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access denied: Session not found');
    }

    // Compare the provided plain-text token against the database hash
    const rtMatches = await bcrypt.compare(rawToken, user.hashedRefreshToken);
    if (!rtMatches) {
      throw new ForbiddenException('Access denied: Invalid or outdated token');
    }

    // Generate a new pair of tokens if validation succeeds
    const payload: JwtPayload = { id: user.id, userNumber: user.userNumber };
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    // Token Rotation: Update the database hash with the newly generated refresh token
    await this.updateRefreshTokenHash(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  /**
   * Hashes a plain-text refresh token and stores it in the database.
   * @param {number} userId - The ID of the user.
   * @param {string} refreshToken - The plain-text refresh token to hash.
   */
  async updateRefreshTokenHash(userId: number, refreshToken: string) {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(refreshToken, salt);
    await this.usersService.update(userId, { hashedRefreshToken: hash });
  }

  /**
   * Verifies the cryptographic signature and expiration of a refresh token.
   * @param token - The raw refresh token to validate.
   * @returns {Promise<JwtPayload>} The decoded payload if the token is valid.
   * @throws {UnauthorizedException} If the token is invalid or expired.
   */
  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: jwtConstants.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }
}
