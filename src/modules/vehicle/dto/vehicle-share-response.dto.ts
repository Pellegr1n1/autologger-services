import { ApiProperty } from '@nestjs/swagger';

export class VehicleShareResponseDto {
  @ApiProperty({ description: 'Token de compartilhamento' })
  shareToken: string;

  @ApiProperty({ description: 'URL pública para compartilhamento' })
  shareUrl: string;

  @ApiProperty({ description: 'Data de expiração do link' })
  expiresAt: Date;

  @ApiProperty({ description: 'Se o link está ativo' })
  isActive: boolean;
}

export class PublicVehicleInfoDto {
  @ApiProperty({ description: 'ID do veículo' })
  id: string;

  @ApiProperty({ description: 'Placa do veículo' })
  plate: string;

  @ApiProperty({ description: 'Marca do veículo' })
  brand: string;

  @ApiProperty({ description: 'Modelo do veículo' })
  model: string;

  @ApiProperty({ description: 'Ano do veículo' })
  year: number;

  @ApiProperty({ description: 'Cor do veículo' })
  color: string;

  @ApiProperty({ description: 'Quilometragem atual' })
  mileage: number;

  @ApiProperty({ description: 'Status do veículo' })
  status: string;

  @ApiProperty({ description: 'Data de cadastro no sistema' })
  createdAt: Date;

  @ApiProperty({ description: 'URL da foto do veículo' })
  photoUrl?: string;

  @ApiProperty({ description: 'Histórico de manutenções' })
  maintenanceHistory: PublicMaintenanceInfoDto[];
}

export class PublicMaintenanceInfoDto {
  @ApiProperty({ description: 'Tipo de serviço' })
  type: string;

  @ApiProperty({ description: 'Categoria do serviço' })
  category: string;

  @ApiProperty({ description: 'Descrição do serviço' })
  description: string;

  @ApiProperty({ description: 'Data do serviço' })
  serviceDate: Date;

  @ApiProperty({ description: 'Quilometragem no momento do serviço' })
  mileage: number;

  @ApiProperty({ description: 'Custo do serviço' })
  cost: number;

  @ApiProperty({ description: 'Local onde foi realizado' })
  location: string;

  @ApiProperty({ description: 'Técnico responsável' })
  technician?: string;

  @ApiProperty({ description: 'Se tem garantia' })
  warranty: boolean;

  @ApiProperty({ description: 'Próxima data de manutenção' })
  nextServiceDate?: Date;

  @ApiProperty({ description: 'Observações' })
  notes?: string;

  @ApiProperty({ description: 'Status de confirmação blockchain' })
  blockchainStatus: string;

  @ApiProperty({ description: 'Hash blockchain' })
  blockchainHash?: string;

  @ApiProperty({ description: 'Anexos do serviço', type: [Object] })
  attachments?: PublicAttachmentDto[];
}

export class PublicAttachmentDto {
  @ApiProperty({ description: 'ID do anexo' })
  id: string;

  @ApiProperty({ description: 'Nome do arquivo' })
  fileName: string;

  @ApiProperty({ description: 'URL do arquivo' })
  fileUrl: string;

  @ApiProperty({ description: 'Tipo do arquivo' })
  fileType: string;

  @ApiProperty({ description: 'Tamanho do arquivo em bytes' })
  fileSize: number;
}
