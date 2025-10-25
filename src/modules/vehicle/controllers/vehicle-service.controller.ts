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
  Request,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { VehicleServiceService } from '../services/vehicle-service.service';
import { CreateVehicleServiceDto } from '../dto/create-vehicle-service.dto';
import { UpdateVehicleServiceDto } from '../dto/update-vehicle-service.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { VehicleService } from '../../vehicle/services/vehicle.service';
import { FileUploadService } from '../services/file-upload.service';

@ApiTags('vehicle-services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicle-services')
export class VehicleServiceController {
  constructor(
    private readonly vehicleServiceService: VehicleServiceService,
    private readonly vehicleService: VehicleService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo serviço de veículo' })
  @ApiResponse({ status: 201, description: 'Serviço criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async create(@Body() createVehicleServiceDto: CreateVehicleServiceDto, @Request() req) {
    const userId = req.user?.id;
    
    // Verificar se o usuário tem veículos cadastrados
    const userVehicles = await this.vehicleService.findUserVehicles(userId);
    if (!userVehicles.active || userVehicles.active.length === 0) {
      throw new BadRequestException('Você precisa ter pelo menos um veículo cadastrado para criar manutenções');
    }

    // Verificar se o veículo especificado pertence ao usuário
    const vehicleExists = userVehicles.active.some(vehicle => vehicle.id === createVehicleServiceDto.vehicleId);
    if (!vehicleExists) {
      throw new BadRequestException('Veículo não encontrado ou não pertence ao usuário');
    }

    return this.vehicleServiceService.create(createVehicleServiceDto);
  }

  @Post('upload-attachments')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Fazer upload de anexos para serviços' })
  @ApiResponse({ status: 201, description: 'Anexos enviados com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro no upload' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadAttachments(@UploadedFiles() files: any[]) {
    console.log('📎 Recebendo arquivos para upload:', files?.length || 0);
    
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    try {
      const uploadedUrls = await this.fileUploadService.uploadMultipleAttachments(files);
      console.log('✅ Arquivos enviados com sucesso:', uploadedUrls);
      
      return {
        success: true,
        urls: uploadedUrls,
        count: uploadedUrls.length,
      };
    } catch (error) {
      console.error('❌ Erro ao fazer upload de anexos:', error);
      throw new BadRequestException('Erro ao fazer upload dos arquivos');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os serviços do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de serviços retornada' })
  findAll(@Request() req) {
    const userId = req.user?.id;
    return this.vehicleServiceService.findAll(userId);
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
  findByType(@Param('type') type: string, @Request() req) {
    const userId = req.user?.id;
    return this.vehicleServiceService.getServicesByType(type as any, userId);
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Listar serviços por status' })
  @ApiResponse({ status: 200, description: 'Lista de serviços por status' })
  findByStatus(@Param('status') status: string, @Request() req) {
    const userId = req.user?.id;
    return this.vehicleServiceService.getServicesByStatus(status as any, userId);
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Listar serviços por intervalo de data' })
  @ApiResponse({ status: 200, description: 'Lista de serviços por data' })
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req,
  ) {
    const userId = req.user?.id;
    return this.vehicleServiceService.getServicesByDateRange(
      new Date(startDate),
      new Date(endDate),
      userId,
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
