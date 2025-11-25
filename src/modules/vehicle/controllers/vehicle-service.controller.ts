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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  async create(
    @Body() createVehicleServiceDto: CreateVehicleServiceDto,
    @Request() req,
  ) {
    const userId = req.user?.id;

    const userVehicles = await this.vehicleService.findUserVehicles(userId);
    if (!userVehicles.active || userVehicles.active.length === 0) {
      throw new BadRequestException(
        'Você precisa ter pelo menos um veículo cadastrado para criar serviços',
      );
    }

    const vehicleExists = userVehicles.active.some(
      (vehicle) => vehicle.id === createVehicleServiceDto.vehicleId,
    );
    if (!vehicleExists) {
      throw new BadRequestException(
        'Veículo não encontrado ou não pertence ao usuário',
      );
    }

    return this.vehicleServiceService.create(createVehicleServiceDto);
  }

  @Post('upload-attachments')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Fazer upload de anexos para serviços',
    description:
      'Aceita apenas: Imagens (JPG, PNG, GIF, WEBP), PDFs e documentos Office (Word, Excel, PowerPoint). Limite: 10MB por arquivo.',
  })
  @ApiResponse({ status: 201, description: 'Anexos enviados com sucesso' })
  @ApiResponse({
    status: 400,
    description:
      'Erro no upload, tipo de arquivo não permitido ou arquivo muito grande',
  })
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
    if (!files || files.length === 0) {
      throw new BadRequestException('Nenhum arquivo foi enviado');
    }

    this.validateFileSizes(files);
    this.validateFileTypes(files);

    try {
      const uploadedUrls =
        await this.fileUploadService.uploadMultipleAttachments(files);

      return {
        success: true,
        urls: uploadedUrls,
        count: uploadedUrls.length,
      };
    } catch (error) {
      throw new BadRequestException(
        `Erro ao fazer upload dos arquivos: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private validateFileSizes(files: any[]): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFile = files.find((file) => file.size > maxSize);

    if (oversizedFile) {
      throw new BadRequestException(
        `Arquivo "${oversizedFile.originalname}" excede o tamanho máximo de 10MB`,
      );
    }
  }

  private validateFileTypes(files: any[]): void {
    const allowedExtensions = new Set([
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.bmp', // Imagens
      '.pdf', // PDFs
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx', // Office
      '.txt', // Texto
    ]);

    const invalidFile = files.find((file) => {
      const fileName = file.originalname?.toLowerCase() || '';
      return !Array.from(allowedExtensions).some((ext) =>
        fileName.endsWith(ext),
      );
    });

    if (invalidFile) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido: "${invalidFile.originalname}". ` +
          `Aceitos: Imagens (JPG, PNG, GIF, WEBP), PDFs e documentos Office (Word, Excel, PowerPoint).`,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os serviços do usuário' })
  @ApiResponse({ status: 200, description: 'Lista de serviços retornada' })
  async findAll(@Request() req) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestException('Usuário não autenticado');
      }
      return await this.vehicleServiceService.findAll(userId);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Erro ao buscar serviços de veículos');
    }
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
    return this.vehicleServiceService.getServicesByStatus(
      status as any,
      userId,
    );
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
  @ApiResponse({
    status: 200,
    description: 'Lista de serviços por quilometragem',
  })
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
  async getServicesCountByVehicle(@Param('vehicleId') vehicleId: string) {
    const count =
      await this.vehicleServiceService.getServicesCountByVehicle(vehicleId);
    return { count };
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
