export interface IWhatsAppPort {
  initialize(): Promise<void>;
  sendPdf(to: string, pdf: Buffer, filename: string): Promise<void>;
  getQrCode(): string | null;
  isConnected(): boolean;
}
