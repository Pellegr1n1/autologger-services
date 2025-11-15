import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';

const StorageProvider: Provider = {
  provide: 'STORAGE',
  useFactory: (configService: ConfigService) => {
    const storageType = configService.get<string>('STORAGE_TYPE', 'local').toLowerCase();

    if (storageType === 's3') {
      try {
        const provider = new S3StorageProvider(configService);
        return provider;
      } catch (error) {
        return new LocalStorageProvider(configService);
      }
    }

    return new LocalStorageProvider(configService);
  },
  inject: [ConfigService],
};

@Module({
  imports: [ConfigModule],
  providers: [StorageProvider],
  exports: ['STORAGE'],
})
export class StorageModule {}

