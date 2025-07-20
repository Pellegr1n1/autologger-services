// src/modules/vehicle/controllers/vehicle.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { VehicleService } from '../services/vehicle.service';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../dto/update-vehicle.dto';
import { VehicleResponseDto } from '../dto/vehicle-response.dto';
import { MarkVehicleSoldDto } from '../dto/mark-vehicle-sold.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';

@ApiTags('Veículos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar novo veículo' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Veículo cadastrado com sucesso',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou limite de veículos atingido',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Placa ou RENAVAM já cadastrados',
  })
  async createVehicle(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.createVehicle(createVehicleDto, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Listar veículos do usuário' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de veículos retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        active: {
          type: 'array',
          items: { $ref: '#/components/schemas/VehicleResponseDto' },
        },
        sold: {
          type: 'array',
          items: { $ref: '#/components/schemas/VehicleResponseDto' },
        },
      },
    },
  })
  async getUserVehicles(@CurrentUser() user: JwtPayload) {
    return this.vehicleService.findUserVehicles(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar veículo por ID' })
  @ApiParam({ name: 'id', description: 'ID do veículo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Veículo encontrado',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Veículo não encontrado',
  })
  async getVehicleById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.findVehicleById(id, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar dados do veículo' })
  @ApiParam({ name: 'id', description: 'ID do veículo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Veículo atualizado com sucesso',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Veículo não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos',
  })
  async updateVehicle(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.updateVehicle(id, updateVehicleDto, user.sub);
  }

  @Patch(':id/mark-sold')
  @ApiOperation({ summary: 'Marcar veículo como vendido' })
  @ApiParam({ name: 'id', description: 'ID do veículo' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Veículo marcado como vendido',
    type: VehicleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Veículo não encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Veículo já foi vendido ou dados inválidos',
  })
  async markVehicleAsSold(
    @Param('id') id: string,
    @Body() markVehicleSoldDto: MarkVehicleSoldDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<VehicleResponseDto> {
    return this.vehicleService.markVehicleAsSold(id, markVehicleSoldDto, user.sub);
  }

  @Get('stats/active-count')
  @ApiOperation({ summary: 'Contar veículos ativos do usuário' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quantidade de veículos ativos',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
        limit: { type: 'number' },
        canAddMore: { type: 'boolean' },
      },
    },
  })
  async getActiveVehiclesStats(@CurrentUser() user: JwtPayload) {
    const count = await this.vehicleService.getActiveVehiclesCount(user.sub);
    const limit = 2;
    
    return {
      count,
      limit,
      canAddMore: count < limit,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir veículo' })
  @ApiParam({ name: 'id', description: 'ID do veículo' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Veículo excluído com sucesso',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Veículo não encontrado',
  })
  async deleteVehicle(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.vehicleService.deleteVehicle(id, user.sub);
  }
}