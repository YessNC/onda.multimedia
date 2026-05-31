import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, Loader2, QrCode, RotateCcw } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats, type Html5QrcodeCameraScanConfig } from 'html5-qrcode'
import CTAButton from '../shared/CTAButton'

type QRScannerProps = {
  disabled?: boolean
  onScan: (value: string) => void
  startSignal?: number
}

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'detected' | 'error'

function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

function getCameraErrorMessage(error: unknown) {
  if (!window.isSecureContext && !isLocalhost(window.location.hostname)) {
    return 'La camara requiere HTTPS para funcionar. Abre esta pagina desde el dominio seguro.'
  }

  const name = error instanceof DOMException ? error.name : ''
  const message = error instanceof Error ? error.message : String(error)
  const details = `${name} ${message}`.toLowerCase()

  if (details.includes('notallowed') || details.includes('permission') || details.includes('denied')) {
    return 'No pudimos acceder a la camara. Revisa los permisos del navegador.'
  }

  if (details.includes('notfound') || details.includes('devicesnotfound') || details.includes('no camera')) {
    return 'No encontramos una camara disponible en este dispositivo.'
  }

  if (
    details.includes('notreadable') ||
    details.includes('trackstart') ||
    details.includes('in use') ||
    details.includes('could not start video')
  ) {
    return 'No pudimos iniciar la camara. Puede estar ocupada por otra aplicacion.'
  }

  if (details.includes('overconstrained') || details.includes('constraint')) {
    return 'No pudimos iniciar la camara trasera. Reintenta o usa la validacion manual.'
  }

  return 'No pudimos acceder a la camara. Revisa los permisos del navegador.'
}

async function getPreferredCamera(): Promise<string | MediaTrackConstraints> {
  try {
    const cameras = await Html5Qrcode.getCameras()
    const rearCamera = cameras.find((camera) =>
      /back|rear|environment|trasera|posterior|ambiente/i.test(camera.label),
    )

    return rearCamera?.id || cameras[0]?.id || { facingMode: { ideal: 'environment' } }
  } catch {
    return { facingMode: { ideal: 'environment' } }
  }
}

export default function QRScanner({ disabled = false, onScan, startSignal = 0 }: QRScannerProps) {
  const reactId = useId()
  const scannerElementId = useMemo(() => `onda-qr-scanner-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [reactId])
  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastScannedText, setLastScannedText] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const stopPromiseRef = useRef<Promise<void> | null>(null)
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

  const stopScanner = useCallback(async (nextStatus: ScannerStatus = 'idle') => {
    if (stopPromiseRef.current) {
      await stopPromiseRef.current
    }

    const scanner = scannerRef.current

    if (!scanner) {
      if (isMountedRef.current) setStatus(nextStatus)
      return
    }

    const stopPromise = (async () => {
      try {
        if (scanner.isScanning) {
          await scanner.stop()
        }
      } catch (error) {
        console.warn('No pudimos detener el scanner QR:', error)
      } finally {
        try {
          scanner.clear()
        } catch (error) {
          console.warn('No pudimos limpiar el scanner QR:', error)
        }

        if (scannerRef.current === scanner) {
          scannerRef.current = null
        }

        if (isMountedRef.current) {
          setStatus(nextStatus)
        }
      }
    })()

    stopPromiseRef.current = stopPromise
    await stopPromise

    if (stopPromiseRef.current === stopPromise) {
      stopPromiseRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      void stopScanner('idle')
    }
  }, [stopScanner])

  const startScanner = useCallback(async () => {
    if (disabled || isStarting || isScanning) return

    setErrorMessage('')
    setLastScannedText('')
    hasDetectedRef.current = false

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setErrorMessage('Este navegador no permite leer la camara. Tambien puedes pegar el token o URL manualmente.')
      return
    }

    if (!window.isSecureContext && !isLocalhost(window.location.hostname)) {
      setStatus('error')
      setErrorMessage('La camara requiere HTTPS para funcionar. Tambien puedes pegar el token o URL manualmente.')
      return
    }

    setStatus('starting')

    try {
      await stopScanner('starting')

      const scanner = new Html5Qrcode(scannerElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      const camera = await getPreferredCamera()
      const scanConfig: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72)

          return {
            height: Math.max(180, Math.min(size, 320)),
            width: Math.max(180, Math.min(size, 320)),
          }
        },
      }

      scannerRef.current = scanner

      await scanner.start(
        camera,
        scanConfig,
        (decodedText) => {
          const scannedText = decodedText.trim()

          if (!scannedText || hasDetectedRef.current) return

          hasDetectedRef.current = true
          setLastScannedText(scannedText)
          setErrorMessage('')
          onScanRef.current(scannedText)
          void stopScanner('detected')
        },
        () => undefined,
      )

      if (!hasDetectedRef.current && isMountedRef.current) {
        setStatus('scanning')
      }
    } catch (error) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch {
          // Nothing else to clean here.
        }

        scannerRef.current = null
      }

      if (isMountedRef.current) {
        setStatus('error')
        setErrorMessage(`${getCameraErrorMessage(error)} Tambien puedes pegar el token o URL manualmente.`)
      }
    }
  }, [disabled, isScanning, isStarting, scannerElementId, stopScanner])

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
            Escanear con camara
          </h2>
          <p className="mt-2 text-sm leading-6 text-onda-muted">
            Usa la camara trasera del telefono para leer el QR de la entrada.
          </p>
        </div>
      </div>

      {status !== 'idle' ? (
        <div className="overflow-hidden rounded-lg border border-onda-purple/24 bg-black/54">
          <div
            id={scannerElementId}
            className="grid min-h-[18rem] w-full place-items-center overflow-hidden text-center text-sm text-onda-muted [&_canvas]:hidden [&_video]:h-full [&_video]:min-h-[18rem] [&_video]:w-full [&_video]:object-cover"
          >
            {isStarting ? (
              <div className="grid justify-items-center gap-3 px-5 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-onda-lavender" aria-hidden="true" />
                Preparando camara...
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
            className="w-full min-h-14"
            icon={<CameraOff className="h-5 w-5" aria-hidden="true" />}
            onClick={() => void stopScanner('idle')}
          >
            Detener camara
          </CTAButton>
        ) : status === 'error' || status === 'detected' ? (
          <CTAButton
            type="button"
            variant="secondary"
            className="w-full min-h-14"
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
          className="w-full min-h-14 sm:col-span-2"
          icon={isStarting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <QrCode className="h-5 w-5" aria-hidden="true" />}
          onClick={handleRetry}
          disabled={disabled || isStarting || isScanning}
        >
          {isStarting ? 'Abriendo camara...' : 'Escanear QR'}
        </CTAButton>
      </div>
    </section>
  )
}
