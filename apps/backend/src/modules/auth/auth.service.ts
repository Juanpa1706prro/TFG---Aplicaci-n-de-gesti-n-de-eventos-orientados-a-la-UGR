import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../user/user.service';
import { User } from '../user/user.entity';
import { jwtConstants } from './constants';
import * as bcrypt from 'bcrypt';
import { UserProfile } from '../user/user-profile.entity';
import { resolveSystemRoleFromOperatorKey } from './operator-key.util';

// -------------------------------------------------------------------
// Authentication Service
// Handles registration, login, token refresh and session management.
// -------------------------------------------------------------------

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface AccessJwtPayload {
  sub: number;
}

interface RefreshJwtPayload {
  sub: number;
  ver: number;
}

@Injectable()
export class AuthService {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------

  /**
   * Registers a new user in the system.
   * @param {string} email - The user's email address.
   * @param {string} pass - The user's plain-text password.
   * @param {string} [operatorKey] - Optional demo key to assign ADMIN, MANAGER or MODERATOR.
   * @returns {Promise<any>} The newly created user entity.
   * @throws {ConflictException} If the email already exists in the database.
   */
  async register(
    email: string,
    pass: string,
    operatorKey?: string,
  ) {
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(pass, salt);
    const randomUserNumber = await this.usersService.generateUniqueUserNumber();

    const user = new User();
    user.email = email;
    user.password = hashedPassword;
    user.role = resolveSystemRoleFromOperatorKey(operatorKey);
    user.onboardingCompleted = false;

    const profile = new UserProfile();
    profile.userNumber = randomUserNumber;
    profile.userName = email.split('@')[0];

    user.profile = profile;

    try {
      // Save the user in the database
      return await this.usersService.create(user);
    } catch (error) {
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
   * @returns {Promise<{ accessToken: string, refreshToken: string, user: any } | null>} Signed tokens and sanitized user data, or null if credentials are invalid.
   */
  async login(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    const refreshVersion = 1;
    const accessToken = await this.generateAccessToken({ sub: user.id });
    const refreshToken = await this.generateRefreshToken({
      sub: user.id,
      ver: refreshVersion,
    });

    await this.persistRefreshSession(user.id, refreshToken, refreshVersion);

    await this.usersService.resetActivePersonaAfterLoginIfMultipleStaffFunctions(
      user.id,
    );
    await this.usersService.ensureDefaultActivePersonaIfMissing(user.id);
    const hydrated = await this.usersService.findByEmail(email);
    if (!hydrated) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toPublicSession(hydrated),
    };
  }

  /**
   * Returns the current session for an authenticated user (same shape as login response user).
   * @param {number} userId - Authenticated user id from the access JWT.
   * @returns {Promise<any>} Public session payload for the user.
   * @throws {UnauthorizedException} If the user does not exist.
   */
  async getMe(userId: number) {
    await this.usersService.ensureDefaultActivePersonaIfMissing(userId);
    const user = await this.usersService.findByID(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return this.usersService.toPublicSession(user);
  }

  /**
   * Logs out the user by removing their refresh token hash from the database.
   * @param {number} userId - The ID of the user logging out.
   * @returns {Promise<void>}
   */
  async logout(userId: number) {
    await this.usersService.update(userId, {
      hashedRefreshToken: null,
      refreshTokenVersion: 0,
    });
  }

  /**
   * Generates a short-lived access token.
   * @param {AccessJwtPayload} payload - The user data to embed in the token.
   * @returns {Promise<string>} The signed JWT access token.
   */
  async generateAccessToken(payload: AccessJwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: jwtConstants.accessSecret,
      expiresIn: '15m',
    });
  }

  /**
   * Generates a long-lived refresh token.
   * @param {RefreshJwtPayload} payload - The user data to embed in the refresh token.
   * @returns {Promise<string>} The signed JWT refresh token.
   */
  async generateRefreshToken(payload: RefreshJwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: '7d',
    });
  }

  /**
   * Rotates access and refresh tokens on each use (RFC 9700 / OAuth BCP).
   * JWT version and DB version detect reuse of an already-rotated refresh token.
   * @param {number} userId - User id from the refresh JWT.
   * @param {string} rawToken - Raw refresh token from the cookie.
   * @param {number} tokenVersion - Version claim from the refresh JWT.
   * @returns {Promise<{ accessToken: string; refreshToken: string }>} New token pair.
   * @throws {ForbiddenException} If the session is missing, outdated or reused.
   */
  async refreshTokens(
    userId: number,
    rawToken: string,
    tokenVersion: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.userRepository.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user || !user.hashedRefreshToken) {
        throw new ForbiddenException('Access denied: Session not found');
      }

      if (user.refreshTokenVersion !== tokenVersion) {
        throw new ForbiddenException(
          'Refresh token reuse detected or session outdated',
        );
      }

      const rtMatches = await bcrypt.compare(rawToken, user.hashedRefreshToken);
      if (!rtMatches) {
        throw new ForbiddenException('Access denied: Invalid refresh token');
      }

      const nextVersion = user.refreshTokenVersion + 1;
      const accessToken = await this.generateAccessToken({ sub: user.id });
      const refreshToken = await this.generateRefreshToken({
        sub: user.id,
        ver: nextVersion,
      });

      const salt = await bcrypt.genSalt();
      const hash = await bcrypt.hash(refreshToken, salt);
      user.hashedRefreshToken = hash;
      user.refreshTokenVersion = nextVersion;
      await userRepo.save(user);

      return { accessToken, refreshToken };
    });
  }

  /**
   * Verifies the cryptographic signature and expiration of a refresh token.
   * @param {string} token - Raw refresh token from the cookie.
   * @returns {Promise<RefreshJwtPayload>} Verified payload with sub and ver.
   * @throws {UnauthorizedException} If the token is invalid or expired.
   */
  async verifyRefreshToken(token: string): Promise<RefreshJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(token, {
        secret: jwtConstants.refreshSecret,
      });
      if (
        payload.sub == null ||
        payload.ver == null ||
        !Number.isFinite(payload.ver)
      ) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or outdated Refresh token');
    }
  }

  // ------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------

  /**
   * Hashes and persists the refresh token and its version for a user session.
   * @param {number} userId - User id.
   * @param {string} refreshToken - Raw refresh JWT to store hashed.
   * @param {number} version - Refresh token version for rotation checks.
   * @returns {Promise<void>}
   */
  private async persistRefreshSession(
    userId: number,
    refreshToken: string,
    version: number,
  ): Promise<void> {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(refreshToken, salt);
    await this.usersService.update(userId, {
      hashedRefreshToken: hash,
      refreshTokenVersion: version,
    });
  }
}
