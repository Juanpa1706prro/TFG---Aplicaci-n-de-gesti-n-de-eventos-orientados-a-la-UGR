import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async register(email: string, pass: string) {
    // 1. Encriptación
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(pass, salt);

    // 2. Número de usuario aleatorio
    const randomUserNumber = Math.floor(100000 + Math.random() * 900000);

    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
      userNumber: randomUserNumber,
    });

    try {
      return await this.userRepository.save(newUser);
    } catch (error) {
      if (error.code === '23505') { // Código de error de duplicado en Postgres
        throw new ConflictException('Este correo ya está registrado.');
      }
      throw error;
    }
  };

  async login(email: string, pass: string) {

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.password);

    if (isMatch) {
      const {password, ...result } = user;
      return user;
    }

    return null;

  }
}