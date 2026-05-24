import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { container } from '../../../../infrastructure/dependency-container';

export async function GET(): Promise<NextResponse> {
  const qrString = container.whatsapp.getQrCode();
  let qrCodeImage: string | null = null;

  if (qrString) {
    qrCodeImage = await QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });
  }

  return NextResponse.json({
    connected: container.whatsapp.isConnected(),
    qrCode: qrCodeImage,
  });
}
