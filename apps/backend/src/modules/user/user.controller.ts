import {
  Controller,
  Get,
  Request,
  Patch,
  Body,
  UseGuards,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { UsersService } from './user.service';
import { JwtAuthGuard } from '../auth/auth.guard-jwt';
import { Public } from '../auth/public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('user')
@UseGuards(JwtAuthGuard) 
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {

    console.log('Raro',req)
    if (!req.user || !req.user.sub) {
      
      throw new UnauthorizedException('No se pudo identificar al usuario');
    }
    console.log('\n--- 🕵️‍♂️ INICIO DEBUG PROFILE ---');
    console.log(
      '1. [GUARD] El token desencriptado contiene este Payload:',
      req.user,
    );

    const userID = req.user.sub;
    console.log(`2. [CONTROLLER] Buscando en BD el ID exacto: ${userID}`);

    const user = await this.userService.findByID(userID);

    if (!user) {
      console.log('❌ [ERROR] Usuario no encontrado en BD para ese ID');
      throw new NotFoundException('El usuario no existe en la base de datos');
    }

    console.log(
      `3. [DATABASE] Encontrado! Pertenece a: ${user.email}`,
    );
    console.log('--- 🏁 FIN DEBUG PROFILE ---\n');

    return {
      message: 'Full profile retrieved',
      user: {
        email: user.email
      },
    };
  }
  @Patch('profile')
  async updateProfile(@Request() req, @Body() body: UpdateProfileDto) {
    const userId = req.user.sub; 
    return this.userService.updateProfile(userId, body);
  }
}
