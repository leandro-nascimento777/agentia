import { Client, LocalAuth, MessageMedia, Message as WWebMessage } from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import { IWhatsAppPort } from '../../domain/ports/input/IWhatsAppPort';
import { ITravelControllerPort } from '../../domain/ports/input/ITravelControllerPort';
import { TravelRequest } from '../../domain/entities/TravelRequest';

const IGNORED_SENDERS = ['status@broadcast'] as const;
const ERROR_REPLY = 'Desculpe, nao consegui processar seu pedido no momento. Por favor, tente novamente.';

export class WhatsAppAdapter implements IWhatsAppPort {
  private readonly client: Client;
  private qrCode: string | null = null;
  private connected = false;

  constructor(private readonly travelController: ITravelControllerPort) {
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      },
    });

    this.bindEvents();
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  async sendPdf(to: string, pdf: Buffer, filename: string): Promise<void> {
    const media = new MessageMedia('application/pdf', pdf.toString('base64'), filename);
    await this.client.sendMessage(to, media);
  }

  getQrCode(): string | null {
    return this.qrCode;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private bindEvents(): void {
    this.client.on('qr', (qr) => {
      this.qrCode = qr;
      qrcodeTerminal.generate(qr, { small: true });
      console.log('\n[WhatsApp] QR Code gerado — escaneie com seu celular\n');
    });

    this.client.on('ready', () => {
      this.connected = true;
      this.qrCode = null;
      console.log('[WhatsApp] Cliente conectado e pronto!');
    });

    this.client.on('disconnected', (reason) => {
      this.connected = false;
      console.log(`[WhatsApp] Desconectado: ${reason}`);
    });

    this.client.on('message', async (message: WWebMessage) => {
      await this.handleMessage(message);
    });

    this.client.on('message_create', async (message: WWebMessage) => {
      if (!message.fromMe) return;
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: WWebMessage): Promise<void> {
    if (IGNORED_SENDERS.includes(message.from as typeof IGNORED_SENDERS[number])) return;
    if (!TravelRequest.isTravelMessage(message.body)) return;

    console.log(`[WhatsApp] Pedido recebido de ${message.from}: "${message.body}"`);

    try {
      const request = TravelRequest.create(message.body, message.from);
      const pdf = await this.travelController.handleRequest(request);
      const filename = `roteiro-${Date.now()}.pdf`;
      await this.sendPdf(message.from, pdf, filename);
      console.log(`[WhatsApp] PDF "${filename}" enviado para ${message.from}`);
    } catch (error) {
      console.error(`[WhatsApp] Erro ao processar pedido de ${message.from}:`, error);
      await this.client.sendMessage(message.from, ERROR_REPLY);
    }
  }
}
