import { validate, ValidationError } from 'class-validator';

/**
 * Helper para testes de validação de DTOs
 * Elimina duplicação nos testes de DTOs
 */
export class DtoValidationTestHelper {
  /**
   * Valida um DTO e retorna os erros
   */
  static async validateDto<T extends object>(
    dto: T,
  ): Promise<ValidationError[]> {
    return await validate(dto);
  }

  /**
   * Cria um DTO com valores padrão e permite sobrescrever propriedades
   */
  static createDto<T>(DtoClass: new () => T, overrides: Partial<T> = {}): T {
    const dto = new DtoClass();
    Object.assign(dto, overrides);
    return dto;
  }

  /**
   * Testa se um DTO é válido com os dados fornecidos
   */
  static async expectValid<T extends object>(
    DtoClass: new () => T,
    data: Partial<T>,
  ): Promise<void> {
    const dto = this.createDto(DtoClass, data);
    const errors = await this.validateDto(dto);
    expect(errors.length).toBe(0);
  }

  /**
   * Testa se um DTO é inválido e verifica qual propriedade falhou
   */
  static async expectInvalid<T extends object>(
    DtoClass: new () => T,
    data: Partial<T>,
    expectedFailedProperty: keyof T,
  ): Promise<void> {
    const dto = this.createDto(DtoClass, data);
    const errors = await this.validateDto(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe(expectedFailedProperty as string);
  }
}
