import { useState } from 'react'
import { useTheme } from './theme'

export const logoDaySrc = '/assets/brand/logo-onda-day.png'
export const logoNightSrc = '/assets/brand/logo-onda.png'

export function useBrandLogoAsset() {
  const { theme } = useTheme()
  const desiredSrc = theme === 'dark' ? logoNightSrc : logoDaySrc
  const fallbackSrc = desiredSrc === logoNightSrc ? logoDaySrc : logoNightSrc
  const [failedSrcs, setFailedSrcs] = useState<string[]>([])
  const src = failedSrcs.includes(desiredSrc) ? fallbackSrc : desiredSrc

  return {
    isMissing: failedSrcs.includes(src),
    src,
    onError: () => {
      setFailedSrcs((current) => (current.includes(src) ? current : [...current, src]))
    },
  }
}
