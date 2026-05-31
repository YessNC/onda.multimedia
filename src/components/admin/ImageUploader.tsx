import { ImagePlus } from 'lucide-react'
import { useI18n } from '../../hooks/useI18n'

export default function ImageUploader() {
  const { t } = useI18n()

  return (
    <div className="glass-panel flex min-h-48 w-full min-w-0 max-w-full flex-col items-center justify-center overflow-hidden rounded-lg border-dashed border-onda-purple/35 p-6 text-center">
      <ImagePlus className="h-8 w-8 text-onda-purple dark:text-onda-lavender" aria-hidden="true" />
      <h3 className="mt-4 font-display text-sm font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
        {t('image-uploader.title')}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-zinc-600 dark:text-onda-muted">
        {t('image-uploader.description')}
      </p>
    </div>
  )
}
