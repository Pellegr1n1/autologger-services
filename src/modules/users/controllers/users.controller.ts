import {
  Controller,
  Get,
  Delete,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { UserResponseDto } from '../dto/user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: UserResponseDto): Promise<UserResponseDto> {
    return user;
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: UserResponseDto,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.usersService.updateProfile(user.id, updateUserDto);
  }

  @Delete('account')
  async deleteAccount(@CurrentUser() user: UserResponseDto): Promise<{ message: string }> {
    await this.usersService.deleteAccount(user.id);
    return { message: 'Conta excluída com sucesso' };
  }
}