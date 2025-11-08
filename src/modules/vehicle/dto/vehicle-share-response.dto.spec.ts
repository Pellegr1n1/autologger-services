import { VehicleShareResponseDto, PublicVehicleInfoDto, PublicMaintenanceInfoDto, PublicAttachmentDto } from './vehicle-share-response.dto';

describe('VehicleShareResponseDto', () => {
  it('should be defined', () => {
    expect(VehicleShareResponseDto).toBeDefined();
  });

  it('should create instance with all properties', () => {
    const dto = new VehicleShareResponseDto();
    dto.shareToken = 'token-123';
    dto.shareUrl = 'http://localhost:3000/vehicles/share/token-123';
    dto.expiresAt = new Date();
    dto.isActive = true;

    expect(dto.shareToken).toBe('token-123');
    expect(dto.shareUrl).toBe('http://localhost:3000/vehicles/share/token-123');
    expect(dto.expiresAt).toBeInstanceOf(Date);
    expect(dto.isActive).toBe(true);
  });
});

describe('PublicVehicleInfoDto', () => {
  it('should be defined', () => {
    expect(PublicVehicleInfoDto).toBeDefined();
  });

  it('should create instance with all properties', () => {
    const dto = new PublicVehicleInfoDto();
    dto.id = 'vehicle-123';
    dto.brand = 'Toyota';
    dto.model = 'Corolla';
    dto.year = 2020;
    dto.color = 'Branco';
    dto.mileage = 50000;
    dto.status = 'active';
    dto.createdAt = new Date();
    dto.photoUrl = 'photo-url';
    dto.maintenanceHistory = [];

    expect(dto.id).toBe('vehicle-123');
    expect(dto.brand).toBe('Toyota');
    expect(dto.model).toBe('Corolla');
    expect(dto.year).toBe(2020);
    expect(dto.color).toBe('Branco');
    expect(dto.mileage).toBe(50000);
    expect(dto.status).toBe('active');
    expect(dto.createdAt).toBeInstanceOf(Date);
    expect(dto.photoUrl).toBe('photo-url');
    expect(dto.maintenanceHistory).toEqual([]);
  });
});

describe('PublicMaintenanceInfoDto', () => {
  it('should be defined', () => {
    expect(PublicMaintenanceInfoDto).toBeDefined();
  });

  it('should create instance with all properties', () => {
    const dto = new PublicMaintenanceInfoDto();
    dto.type = 'Manutenção';
    dto.category = 'Oleo';
    dto.description = 'Troca de oleo';
    dto.serviceDate = new Date();
    dto.mileage = 50000;
    dto.cost = 150.0;
    dto.location = 'Oficina';
    dto.technician = 'João';
    dto.warranty = true;
    dto.nextServiceDate = new Date();
    dto.notes = 'Observações';
    dto.blockchainStatus = 'Confirmado';
    dto.blockchainHash = 'hash123';
    dto.createdAt = new Date();
    dto.attachments = [];

    expect(dto.type).toBe('Manutenção');
    expect(dto.category).toBe('Oleo');
    expect(dto.description).toBe('Troca de oleo');
    expect(dto.serviceDate).toBeInstanceOf(Date);
    expect(dto.mileage).toBe(50000);
    expect(dto.cost).toBe(150.0);
    expect(dto.location).toBe('Oficina');
    expect(dto.technician).toBe('João');
    expect(dto.warranty).toBe(true);
    expect(dto.nextServiceDate).toBeInstanceOf(Date);
    expect(dto.notes).toBe('Observações');
    expect(dto.blockchainStatus).toBe('Confirmado');
    expect(dto.blockchainHash).toBe('hash123');
    expect(dto.createdAt).toBeInstanceOf(Date);
    expect(dto.attachments).toEqual([]);
  });
});

describe('PublicAttachmentDto', () => {
  it('should be defined', () => {
    expect(PublicAttachmentDto).toBeDefined();
  });

  it('should create instance with all properties', () => {
    const dto = new PublicAttachmentDto();
    dto.id = 'attachment-123';
    dto.fileName = 'file.pdf';
    dto.fileUrl = 'http://example.com/file.pdf';
    dto.fileType = 'application/pdf';
    dto.fileSize = 1024;

    expect(dto.id).toBe('attachment-123');
    expect(dto.fileName).toBe('file.pdf');
    expect(dto.fileUrl).toBe('http://example.com/file.pdf');
    expect(dto.fileType).toBe('application/pdf');
    expect(dto.fileSize).toBe(1024);
  });
});

