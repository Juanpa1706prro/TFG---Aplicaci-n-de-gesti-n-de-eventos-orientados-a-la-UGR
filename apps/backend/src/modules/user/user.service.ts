import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

// ------------------------------------------------------------
// User Service.
// ------------------------------------------------------------
@Injectable()
export class UsersService {
  // ------------------------------------------------------------
  // Constructor: Injects required services.
  // ------------------------------------------------------------

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ------------------------------------------------------------
  // Methods.
  // ------------------------------------------------------------

  /**
   * Creates and saves a new user in the database.
   * @param {Partial<User>} data - The user data payload (email, password hash, userNumber).
   * @returns {Promise<User>} The newly saved user entity.
   */
  async create(data: Partial<User>) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  /**
   * Updates specific fields of an existing user in the database.
   * @param {number} id - The primary key ID of the user.
   * @param {Partial<User>} data - The partial object containing the fields to update.
   * @returns {Promise<User>} The result of the update operation.
   */
  async update(id: number, data: Partial<User>) {
    return this.userRepository.update(id, data);
  }

  /**
   * Generates a unique, random 6-digit identification number.
   * @returns {Promise<number>} A guaranteed unique 6-digit number.
   */
  async generateUniqueUserNumber(): Promise<number> {
    let exists = true;
    let randomNumber: number = 0;

    while (exists) {
      // Generate a random number between 100000 and 999999
      randomNumber = Math.floor(100000 + Math.random() * 900000);

      // Check for collision in the database
      const user = await this.userRepository.findOne({
        where: { userNumber: randomNumber },
      });

      if (!user) exists = false;
    }
    return randomNumber;
  }

  /**
   * Retrieves a user by their email address.
   * @param {string} email - The exact email address to search for.
   * @returns {Promise<User | null>} The user entity, or null if not found.
   */
  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Retrieves a user by their unique 6-digit VIP number.
   * @param {number} userNumber - The VIP number to search for.
   * @returns {Promise<User | null>} The user entity, or null if not found.
   */
  async findByNumber(userNumber: number) {
    return this.userRepository.findOne({ where: { userNumber } });
  }

  /**
   * Retrieves a user by their internal database primary key.
   * @param {number} id - The primary key ID.
   * @returns {Promise<User | null>} The user entity, or null if not found.
   */
  async findByID(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }
}
