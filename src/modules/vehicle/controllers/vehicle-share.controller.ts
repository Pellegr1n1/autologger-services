import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VehicleShareService } from '../services/vehicle-share.service';
import {
  VehicleShareResponseDto,
  PublicVehicleInfoDto,
} from '../dto/vehicle-share-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserResponseDto } from '@/modules/user/dto/user-response.dto';

@ApiTags('Compartilhamento de Veículos')
@Controller('vehicles')
export class VehicleShareController {
  constructor(private readonly vehicleShareService: VehicleShareService) {}

  @Post(':id/generate-share-link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar link de compartilhamento para veículo' })
  @ApiParam({ name: 'id', description: 'ID do veículo' })
  @ApiQuery({
    name: 'expiresInDays',
    required: false,
    description: 'Dias para expiração (padrão: 30)',
  })
  @ApiQuery({
    name: 'includeAttachments',
    required: false,
    description: 'Incluir anexos nos dados compartilhados (padrão: false)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Link de compartilhamento gerado com sucesso',
    type: VehicleShareResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Veículo não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Veículo não pertence ao usuário',
  })
  async generateShareLink(
    @Param('id') vehicleId: string,
    @CurrentUser() user: UserResponseDto,
    @Query('expiresInDays') expiresInDays?: string,
    @Query('includeAttachments') includeAttachments?: string,
  ): Promise<VehicleShareResponseDto> {
    const days = expiresInDays ? Number.parseInt(expiresInDays) : 30;
    const includeAttachmentsBool = includeAttachments === 'true';
    return this.vehicleShareService.generateShareToken(
      vehicleId,
      user.id,
      days,
      includeAttachmentsBool,
    );
  }

  @Get('share/:shareToken')
  @ApiOperation({ summary: 'Visualizar informações públicas do veículo' })
  @ApiParam({ name: 'shareToken', description: 'Token de compartilhamento' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Informações do veículo retornadas com sucesso',
    type: PublicVehicleInfoDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Link de compartilhamento não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Link de compartilhamento expirado',
  })
  async getPublicVehicleInfo(
    @Param('shareToken') shareToken: string,
  ): Promise<PublicVehicleInfoDto> {
    return this.vehicleShareService.getPublicVehicleInfo(shareToken);
  }

  @Delete('share/:shareToken')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar link de compartilhamento' })
  @ApiParam({ name: 'shareToken', description: 'Token de compartilhamento' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Link desativado com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Token de compartilhamento não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Token não pertence ao usuário',
  })
  async deactivateShareLink(
    @Param('shareToken') shareToken: string,
    @CurrentUser() user: UserResponseDto,
  ): Promise<void> {
    return this.vehicleShareService.deactivateShareToken(shareToken, user.id);
  }

  @Get('my-shares')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar links de compartilhamento do usuário' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de links de compartilhamento',
  })
  async getMyShareLinks(@CurrentUser() user: UserResponseDto) {
    return this.vehicleShareService.getUserShareTokens(user.id);
  }
}
