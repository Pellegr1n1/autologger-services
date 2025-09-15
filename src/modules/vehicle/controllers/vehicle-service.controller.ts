import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehicleServiceService } from '../services/vehicle-service.service';
import { CreateVehicleServiceDto } from '../dto/create-vehicle-service.dto';
import { UpdateVehicleServiceDto } from '../dto/update-vehicle-service.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('vehicle-services')
@ApiBearerAuth()
@Controller('vehicle-services')
export class VehicleServiceController {
  constructor(private readonly vehicleServiceService: VehicleServiceService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo serviço de veículo' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Body() createVehicleServiceDto: CreateVehicleServiceDto) {
    return this.vehicleServiceService.create(createVehicleServiceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os serviços' })
  @ApiResponse({ status: 200, description: 'Lista de serviços retornada' })
  findAll() {
    return this.vehicleServiceService.findAll();
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Listar serviços por veículo' })
  @ApiResponse({ status: 200, description: 'Lista de serviços do veículo' })
  findByVehicleId(@Param('vehicleId') vehicleId: string) {
    return this.vehicleServiceService.findByVehicleId(vehicleId);
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Listar serviços por tipo' })
  @ApiResponse({ status: 200, description: 'Lista de serviços por tipo' })
  findByType(@Param('type') type: string) {
    return this.vehicleServiceService.getServicesByType(type as any);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Listar serviços por status' })
  @ApiResponse({ status: 200, description: 'Lista de serviços por status' })
  findByStatus(@Param('status') status: string) {
    return this.vehicleServiceService.getServicesByStatus(status as any);
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Listar serviços por intervalo de data' })
  @ApiResponse({ status: 200, description: 'Lista de serviços por data' })
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.vehicleServiceService.getServicesByDateRange(
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('mileage-range')
  @ApiOperation({ summary: 'Listar serviços por intervalo de quilometragem' })
  @ApiResponse({ status: 200, description: 'Lista de serviços por quilometragem' })
  findByMileageRange(
    @Query('minMileage') minMileage: number,
    @Query('maxMileage') maxMileage: number,
  ) {
    return this.vehicleServiceService.getServicesByMileageRange(
      minMileage,
      maxMileage,
    );
  }

  @Get('vehicle/:vehicleId/total-cost')
  @ApiOperation({ summary: 'Obter custo total dos serviços de um veículo' })
  @ApiResponse({ status: 200, description: 'Custo total retornado' })
  getTotalCostByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.vehicleServiceService.getTotalCostByVehicle(vehicleId);
  }

  @Get('vehicle/:vehicleId/count')
  @ApiOperation({ summary: 'Obter quantidade de serviços de um veículo' })
  @ApiResponse({ status: 200, description: 'Quantidade retornada' })
  getServicesCountByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.vehicleServiceService.getServicesCountByVehicle(vehicleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um serviço específico' })
  @ApiResponse({ status: 200, description: 'Serviço retornado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  findOne(@Param('id') id: string) {
    return this.vehicleServiceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um serviço' })
  @ApiResponse({ status: 200, description: 'Serviço atualizado' })
  @ApiResponse({ status: 400, description: 'Serviço não pode ser editado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  update(
    @Param('id') id: string,
    @Body() updateVehicleServiceDto: UpdateVehicleServiceDto,
  ) {
    return this.vehicleServiceService.update(id, updateVehicleServiceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um serviço' })
  @ApiResponse({ status: 200, description: 'Serviço removido' })
  @ApiResponse({ status: 400, description: 'Serviço não pode ser removido' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  remove(@Param('id') id: string) {
    return this.vehicleServiceService.remove(id);
  }

  @Patch(':id/blockchain-status')
  @ApiOperation({ summary: 'Atualizar status blockchain de um serviço' })
  @ApiResponse({ status: 200, description: 'Status atualizado' })
  @ApiResponse({ status: 404, description: 'Serviço não encontrado' })
  updateBlockchainStatus(
    @Param('id') id: string,
    @Body() body: { hash?: string; confirmedBy: string },
  ) {
    return this.vehicleServiceService.updateBlockchainStatus(
      id,
      body.hash || null,
      body.confirmedBy,
    );
  }
}
