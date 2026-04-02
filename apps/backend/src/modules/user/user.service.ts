import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}


  async create(data: Partial<User>) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  // Método para generar un número único que no exista en la DB
  async generateUniqueUserNumber(): Promise<number> {
    let exists = true;
    let randomNumber: number = 0;

    while (exists) {
      randomNumber = Math.floor(100000 + Math.random() * 900000);
      const user = await this.userRepository.findOne({ where: { userNumber: randomNumber } });
      if (!user) exists = false; // Si no lo encuentra, el número es válido
    }
    return randomNumber;
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByNumber(userNumber: number) {
    return this.userRepository.findOne({ where: { userNumber } });
  }

  async findByID(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }
}