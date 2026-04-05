import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/modules/user/user.service';
import * as bcrypt from 'bcrypt';

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
    private jwtService: JwtService,
  ) {}

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
        throw new ConflictException('Este correo ya está registrado.');
      }
      throw error;
    }
  }

  /**
   * Authenticates a user on the system.
   * @param {string} email - The user's email address.
   * @param {string} pass - The user's plain-text password.
   * @returns {Promise<{ accessToken: string, user: any } | null>} An object containing the signed JWT and sanitized user data, or null if credentials are invalid.
   */
  async login(email: string, pass: string) {

    // Check if user exists
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    // Verify the provided password against the hashed password in the database
    const isMatch = await bcrypt.compare(pass, user.password);


    if (isMatch) {

      // Construct the JWT payload using the explicit 'id'
      const payload = {
        id: user.id,
        userNumber: user.userNumber,
      };

      // Sign and generate the Access Token
      const accessToken = await this.jwtService.signAsync(payload);


      // Return the token and sanitized user details
      return {
        accessToken,
        user: {
          id: user.id,
          userNumber: user.userNumber,
          email: user.email,
        },
      };
    }

    // If password does not match
    return null;
  }
}
