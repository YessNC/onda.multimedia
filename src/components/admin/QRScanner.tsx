import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Camera, CameraOff, Loader2, QrCode, RotateCcw } from 'lucide-react'
import CTAButton from '../shared/CTAButton'

type QRScannerProps = {
  disabled?: boolean
  onScan: (value: string) => void
  startSignal?: number
}

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'detected' | 'error'

type ScannerControls = {
  stop: () => void
}

function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

function getCameraErrorMessage(error: unknown) {
  if (!window.isSecureContext && !isLocalhost(window.location.hostname)) {
    return 'La cámara requiere HTTPS para funcionar. Abre esta página desde el dominio seguro.'
  }

  const name = error instanceof DOMException ? error.name : ''
  const message = error instanceof Error ? error.message : String(error)
  const details = `${name} ${message}`.toLowerCase()

  if (details.includes('notallowed') || details.includes('permission') || details.includes('denied')) {
    return 'No pudimos acceder a la cámara. Revisa los permisos del navegador.'
  }

  if (details.includes('notfound') || details.includes('devicesnotfound') || details.includes('no camera')) {
    return 'No encontramos una cámara disponible en este dispositivo.'
  }

  if (
    details.includes('notreadable') ||
    details.includes('trackstart') ||
    details.includes('in use') ||
    details.includes('could not start video')
  ) {
    return 'No pudimos iniciar la cámara. Puede estar ocupada por otra aplicación.'
  }

  if (details.includes('overconstrained') || details.includes('constraint')) {
    return 'No pudimos iniciar la cámara trasera. Reintenta o usa la validación manual.'
  }

  return 'No pudimos acceder a la cámara. Revisa los permisos del navegador.'
}

export default function QRScanner({ disabled = false, onScan, startSignal = 0 }: QRScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastScannedText, setLastScannedText] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<ScannerControls | null>(null)
  const hasDetectedRef = useRef(false)
  const isMountedRef = useRef(true)
  const lastStartSignalRef = useRef(startSignal)
  const onScanRef = useRef(onScan)

  const isStarting = status === 'starting'
  const isScanning = status === 'scanning'
  const canStop = status === 'starting' || status === 'scanning'

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const stopVideoTracks = useCallback(() => {
    const video = videoRef.current
    const stream = video?.srcObject as MediaStream | null

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    if (video) {
      video.pause()
      video.srcObject = null
      video.removeAttribute('src')
      video.load()
    }
  }, [])

  const stopScanner = useCallback(
    async (nextStatus: ScannerStatus = 'idle') => {
      try {
        controlsRef.current?.stop()
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('No pudimos detener controles del scanner:', error)
        }
      }

      controlsRef.current = null

      try {
        stopVideoTracks()
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('No pudimos detener stream de cámara:', error)
        }
      }

      if (isMountedRef.current) {
        setStatus(nextStatus)
      }
    },
    [stopVideoTracks],
  )

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      void stopScanner('idle')
    }
  }, [stopScanner])

  const startScanner = useCallback(async () => {
    if (disabled || status === 'starting' || status === 'scanning') return

    setErrorMessage('')
    setLastScannedText('')
    hasDetectedRef.current = false

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setErrorMessage('Este navegador no permite leer la cámara. También puedes pegar el código, token o URL manualmente.')
      return
    }

    if (!window.isSecureContext && !isLocalhost(window.location.hostname)) {
      setStatus('error')
      setErrorMessage('La cámara requiere HTTPS para funcionar. También puedes pegar el código, token o URL manualmente.')
      return
    }

    try {
      await stopScanner('idle')

      if (!isMountedRef.current) return

      setStatus('starting')

      await nextFrame()
      await nextFrame()

      const video = videoRef.current

      if (!video) {
        throw new Error('No encontramos el contenedor de video del lector QR.')
      }

      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.muted = true
      video.autoplay = true

      const reader = new BrowserQRCodeReader()

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const controls = await reader.decodeFromConstraints(constraints, video, (result, error, scanControls) => {
        if (result) {
          const scannedText = result.getText().trim()

          if (!scannedText || hasDetectedRef.current) return

          hasDetectedRef.current = true
          setLastScannedText(scannedText)
          setErrorMessage('')

          try {
            scanControls.stop()
          } catch {
            // Si ya se detuvo, no bloqueamos.
          }

          stopVideoTracks()
          onScanRef.current(scannedText)

          if (isMountedRef.current) {
            setStatus('detected')
          }

          return
        }

        if (import.meta.env.DEV && error?.name && error.name !== 'NotFoundException') {
          console.debug('QR scan attempt:', error.name)
        }
      })

      controlsRef.current = controls as ScannerControls

      try {
        await video.play()
      } catch {
        // iOS puede rechazar play() aunque el stream esté activo.
      }

      if (!hasDetectedRef.current && isMountedRef.current) {
        setStatus('scanning')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Error iniciando scanner QR:', error)
      }

      await stopScanner('idle')

      if (isMountedRef.current) {
        setStatus('error')
        setErrorMessage(`${getCameraErrorMessage(error)} También puedes pegar el código, token o URL manualmente.`)
      }
    }
  }, [disabled, status, stopScanner, stopVideoTracks])

  useEffect(() => {
    if (!startSignal || lastStartSignalRef.current === startSignal) return

    lastStartSignalRef.current = startSignal
    void startScanner()
  }, [startScanner, startSignal])

  function handleRetry() {
    void startScanner()
  }

  return (
    <section className="glass-panel grid gap-5 rounded-lg bg-onda-black/72 p-5 shadow-[0_0_34px_rgba(123,44,255,0.18)] sm:p-6">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-onda-purple/16 text-onda-lavender">
          <Camera className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="min-w-0">
          <h2 className="font-display text-lg font-extrabold uppercase tracking-[0.13em] text-white">
            Escanear con cámara
          </h2>
          <p className="mt-2 text-sm leading-6 text-onda-muted">
            Usa la cámara trasera del teléfono para leer el QR de la entrada.
          </p>
        </div>
      </div>

      {status !== 'idle' ? (
        <div className="relative overflow-hidden rounded-lg border border-onda-purple/24 bg-black">
          <div className="relative aspect-[3/4] min-h-[20rem] w-full overflow-hidden bg-black sm:aspect-video sm:min-h-[22rem]">
            <video
              ref={videoRef}
              className="absolute inset-0 block h-full min-h-[20rem] w-full bg-black object-cover"
              muted
              playsInline
              autoPlay
            />

            {isStarting ? (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/72 px-5 py-12 text-center text-sm font-semibold text-onda-soft">
                <div className="grid justify-items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-onda-lavender" aria-hidden="true" />
                  Iniciando cámara...
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold leading-6 text-red-100">
          {errorMessage}
        </p>
      ) : null}

      {lastScannedText && status === 'detected' ? (
        <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold leading-6 text-emerald-100">
          QR detectado. Puedes reintentar para leer otra entrada.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {canStop ? (
          <CTAButton
            type="button"
            variant="secondary"
            className="min-h-14 w-full"
            icon={<CameraOff className="h-5 w-5" aria-hidden="true" />}
            onClick={() => void stopScanner('idle')}
          >
            Detener cámara
          </CTAButton>
        ) : status === 'error' || status === 'detected' ? (
          <CTAButton
            type="button"
            variant="secondary"
            className="min-h-14 w-full"
            icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
            onClick={handleRetry}
            disabled={disabled}
          >
            Reintentar escaneo
          </CTAButton>
        ) : null}

        <CTAButton
          type="button"
          variant="primary"
          className="min-h-14 w-full sm:col-span-2"
          icon={
            isStarting ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <QrCode className="h-5 w-5" aria-hidden="true" />
            )
          }
          onClick={handleRetry}
          disabled={disabled || isStarting || isScanning}
        >
          {isStarting ? 'Abriendo cámara...' : 'Escanear QR'}
        </CTAButton>
      </div>
    </section>
  )
}