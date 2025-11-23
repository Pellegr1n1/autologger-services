import { VehicleModule } from './vehicle.module';

describe('VehicleModule', () => {
  it('should be defined', () => {
    expect(VehicleModule).toBeDefined();
  });

  it('should be a module', () => {
    const module = new VehicleModule();
    expect(module).toBeInstanceOf(VehicleModule);
  });
});
