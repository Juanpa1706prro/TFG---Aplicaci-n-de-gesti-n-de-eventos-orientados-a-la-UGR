import {
  Controller,
  Get,
  Request,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './user.service';
import { JwtAuthGuard } from '../auth/auth.guard-jwt';
import { Public } from '../auth/public.decorator';

@Controller('user')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Public() // <--- ¡LA CERRADURA ESTÁ ECHADA!
  @Get('profile')
  async getProfile(@Request() req) {
    console.log('\n--- 🕵️‍♂️ INICIO DEBUG PROFILE ---');
    console.log(
      '1. [GUARD] El token desencriptado contiene este Payload:',
      req.user,
    );

    const userID = req.user.id;
    console.log(`2. [CONTROLLER] Buscando en BD el ID exacto: ${userID}`);

    const user = await this.userService.findByID(userID);

    if (!user) {
      console.log('❌ [ERROR] Usuario no encontrado en BD para ese ID');
      throw new NotFoundException('El usuario no existe en la base de datos');
    }

    console.log(
      `3. [DATABASE] Encontrado! Pertenece a: ${user.email} (VIP: ${user.userNumber})`,
    );
    console.log('--- 🏁 FIN DEBUG PROFILE ---\n');

    return {
      message: 'Full profile retrieved',
      user: {
        email: user.email,
        userNumber: user.userNumber,
      },
    };
  }
}
