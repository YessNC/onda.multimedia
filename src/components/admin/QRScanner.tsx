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

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

async function waitForVisibleElement(elementId: string) {
  await nextFrame()
  await nextFrame()

  const element = document.getElementById(elementId)

  if (!element) {
    throw new Error('No encontramos el contenedor del lector QR.')
  }

  const rect = element.getBoundingClientRect()

  if (rect.width < 80 || rect.height < 160) {
    await nextFrame()
  }

  return element
}

function patchScannerVideo(elementId: string) {
  const root = document.getElementById(elementId)
  const video = root?.querySelector('video') as HTMLVideoElement | null

  if (!video) return

  video.setAttribute('playsinline', 'true')
  video.setAttribute('webkit-playsinline', 'true')
  video.autoplay = true
  video.muted = true

  video.style.width = '100%'
  video.style.height = '100%'
  video.style.minHeight = '320px'
  video.style.objectFit = 'cover'
  video.style.display = 'block'
  video.style.background = '#000'

  void video.play().catch(() => {
    // En iOS a veces play() falla aunque el stream quede activo.
  })
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

async function getFallbackCamera(): Promise<string | MediaTrackConstraints> {
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
    if (disabled || status === 'starting' || status === 'scanning') return

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

    try {
      await stopScanner('idle')

      if (!isMountedRef.current) return

      setStatus('starting')

      await waitForVisibleElement(scannerElementId)

      const scanner = new Html5Qrcode(scannerElementId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: import.meta.env.DEV,
      })

      scannerRef.current = scanner

      const scanConfig: Html5QrcodeCameraScanConfig = {
        fps: 8,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const size = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72)

          return {
            height: Math.max(180, Math.min(size, 340)),
            width: Math.max(180, Math.min(size, 340)),
          }
        },
      }

      const handleDecoded = (decodedText: string) => {
        const scannedText = decodedText.trim()

        if (!scannedText || hasDetectedRef.current) return

        hasDetectedRef.current = true
        setLastScannedText(scannedText)
        setErrorMessage('')
        onScanRef.current(scannedText)
        void stopScanner('detected')
      }

      const handleDecodeError = () => undefined

      try {
        await scanner.start({ facingMode: { ideal: 'environment' } }, scanConfig, handleDecoded, handleDecodeError)
      } catch (primaryError) {
        if (import.meta.env.DEV) {
          console.warn('No pudimos iniciar con facingMode environment. Intentando fallback:', primaryError)
        }

        try {
          scanner.clear()
        } catch {
          // Continuar con fallback.
        }

        const fallbackCamera = await getFallbackCamera()
        await scanner.start(fallbackCamera, scanConfig, handleDecoded, handleDecodeError)
      }

      patchScannerVideo(scannerElementId)

      await nextFrame()
      patchScannerVideo(scannerElementId)

      if (!hasDetectedRef.current && isMountedRef.current) {
        setStatus('scanning')
      }
    } catch (error) {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop()
          }
        } catch {
          // Nada más que detener.
        }

        try {
          scannerRef.current.clear()
        } catch {
          // Nada más que limpiar.
        }

        scannerRef.current = null
      }

      if (isMountedRef.current) {
        setStatus('error')
        setErrorMessage(`${getCameraErrorMessage(error)} Tambien puedes pegar el token o URL manualmente.`)
      }
    }
  }, [disabled, scannerElementId, status, stopScanner])

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
        <div className="relative overflow-hidden rounded-lg border border-onda-purple/24 bg-black">
          <div
            id={scannerElementId}
            className="relative grid aspect-[3/4] min-h-[20rem] w-full place-items-center overflow-hidden bg-black text-center text-sm text-onda-muted sm:aspect-video sm:min-h-[22rem]
              [&_canvas]:!absolute [&_canvas]:!inset-0 [&_canvas]:!h-full [&_canvas]:!w-full
              [&_video]:!absolute [&_video]:!inset-0 [&_video]:!block [&_video]:!h-full [&_video]:!min-h-[20rem] [&_video]:!w-full [&_video]:!bg-black [&_video]:!object-cover"
          />

          {isStarting ? (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-black/72 px-5 py-12 text-center text-sm font-semibold text-onda-soft">
              <div className="grid justify-items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-onda-lavender" aria-hidden="true" />
                Iniciando camara...
              </div>
            </div>
          ) : null}
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
          {isStarting ? 'Abriendo camara...' : 'Escanear QR'}
        </CTAButton>
      </div>
    </section>
  )
}