export interface IStorage {
  /**
   * Faz upload de um arquivo
   * @param fileBuffer Buffer do arquivo
   * @param fileName Nome do arquivo (com extensão)
   * @param folder Pasta onde o arquivo será salvo (ex: 'vehicles', 'attachments')
   * @returns URL pública do arquivo
   */
  upload(fileBuffer: Buffer, fileName: string, folder: string): Promise<string>;

  /**
   * Deleta um arquivo
   * @param fileUrl URL do arquivo a ser deletado
   */
  delete(fileUrl: string): Promise<void>;

  /**
   * Verifica se o storage está configurado corretamente
   */
  isConfigured(): boolean;

  /**
   * Obtém uma URL acessível para o arquivo (pública ou assinada)
   * @param fileUrl URL do arquivo armazenado
   * @param expiresIn Tempo de expiração em segundos (apenas para signed URLs)
   * @returns URL acessível para download/visualização
   */
  getAccessibleUrl?(fileUrl: string, expiresIn?: number): Promise<string>;
}

