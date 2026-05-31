declare module 'qrcode' {
  type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H'

  type QrCodeToDataUrlOptions = {
    color?: {
      dark?: string
      light?: string
    }
    errorCorrectionLevel?: QrErrorCorrectionLevel
    margin?: number
    width?: number
  }

  const QRCode: {
    toDataURL(text: string, options?: QrCodeToDataUrlOptions): Promise<string>
  }

  export default QRCode
}
