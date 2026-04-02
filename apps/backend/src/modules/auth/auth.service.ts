import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/modules/user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {

  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async register(email: string, pass: string) {
    // 1. Encriptación
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(pass, salt);

    // 2. Número de usuario aleatorio
    const randomUserNumber = await this.usersService.generateUniqueUserNumber();

    try {
      return await this.usersService.create({
        email,
        password: hashedPassword,
        userNumber: randomUserNumber,
      });
    } catch (error) {
      if (error.code === '23505') { // Código de error de duplicado en Postgres
        throw new ConflictException('Este correo ya está registrado.');
      }
      throw error;
    }

  };

  async login(email: string, pass: string) {

    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.password);

    if (isMatch) {
      const payload = { 
        id: user.id, 
        userNumber: user.userNumber 
      };

      const accessToken = await this.jwtService.signAsync(payload);
      
      return {
        accessToken,
        user: {
          id: user.id,
          userNumber: user.userNumber,
          email: user.email, // o username, según cómo lo tengas en tu base de datos
        }
      };

    }

    return null;

  }
}