import { Controller, Get, Delete, Put, Body, UseGuards } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserResponseDto } from '../dto/user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  async getProfile(
    @CurrentUser() user: UserResponseDto,
  ): Promise<UserResponseDto> {
    return user;
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: UserResponseDto,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.userService.updateProfile(user.id, updateUserDto);
  }

  @Delete('account')
  async deleteAccount(
    @CurrentUser() user: UserResponseDto,
  ): Promise<{ message: string }> {
    await this.userService.deleteAccount(user.id);
    return { message: 'Conta excluída com sucesso' };
  }
}
