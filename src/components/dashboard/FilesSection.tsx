import { useMemo, useState } from 'react'
import { Download, FileText, Filter, Loader2, Music, Search, Video } from 'lucide-react'
import OndaSelect, { type OndaSelectOption } from '../shared/OndaSelect'
import { useI18n } from '../../hooks/useI18n'
import {
  type FileFilter,
  type SharedFile,
  createFileDownloadUrl,
  fileFilters,
  formatFileSize,
} from '../../lib/dashboard'

interface FilesSectionProps {
  files: SharedFile[]
  onError: (message: string) => void
}

export default function FilesSection({ files, onError }: FilesSectionProps) {
  const { language, t } = useI18n()
  const [fileFilter, setFileFilter] = useState<FileFilter>('all')
  const [fileSearch, setFileSearch] = useState('')
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)
  const uploadDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [language],
  )
  const filterOptions = useMemo<OndaSelectOption[]>(
    () =>
      fileFilters.map((filter) => ({
        value: filter,
        label: t(`dashboard.files.filter.${filter}`),
      })),
    [t],
  )

  const filteredFiles = useMemo(() => {
    const query = fileSearch.trim().toLowerCase()

    return files.filter((file) => {
      const matchesType = fileFilter === 'all' || file.file_type === fileFilter
      const matchesQuery =
        !query ||
        file.file_name.toLowerCase().includes(query) ||
        (file.project_name ?? '').toLowerCase().includes(query)

      return matchesType && matchesQuery
    })
  }, [fileFilter, fileSearch, files])

  const handleDownload = async (file: SharedFile) => {
    setDownloadingFileId(file.id)

    try {
      const signedUrl = await createFileDownloadUrl(file)
      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      onError(error instanceof Error ? error.message : t('dashboard.files.downloadError'))
    } finally {
      setDownloadingFileId(null)
    }
  }

  return (
    <div className="mt-8">
      <div className="glass-panel rounded-lg bg-white/70 p-4 sm:p-6 dark:bg-onda-black/48">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-onda-lavender">
              {t('dashboard.files.eyebrow')}
            </p>
            <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-[0.08em] text-zinc-950 dark:text-white">
              {t('dashboard.files.title')}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:min-w-[34rem]">
            <label className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
              <input
                type="search"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder={t('dashboard.files.searchPlaceholder')}
                className="h-11 w-full rounded-md border border-onda-purple/20 bg-white/[0.82] pl-10 pr-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-500 focus:border-onda-purple focus:ring-2 focus:ring-onda-purple/25 dark:border-onda-lavender/20 dark:bg-white/10 dark:text-white dark:placeholder:text-onda-muted/70 dark:focus:border-onda-lavender dark:focus:ring-onda-purple/35"
              />
            </label>

            <OndaSelect
              ariaLabel={t('dashboard.files.filterAria')}
              className="sm:w-44"
              icon={<Filter className="h-4 w-4" aria-hidden="true" />}
              value={fileFilter}
              onChange={(value) => setFileFilter(value as FileFilter)}
              options={filterOptions}
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-onda-lavender/15">
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-onda-muted">
              {t('dashboard.files.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-onda-lavender/10 text-left text-sm">
                <thead className="bg-onda-purple/14 text-xs uppercase tracking-[0.12em] text-onda-lavender">
                  <tr>
                    <th className="px-4 py-3">{t('dashboard.files.file')}</th>
                    <th className="px-4 py-3">{t('dashboard.files.type')}</th>
                    <th className="px-4 py-3">{t('dashboard.files.project')}</th>
                    <th className="px-4 py-3">{t('dashboard.files.size')}</th>
                    <th className="px-4 py-3">{t('dashboard.files.uploaded')}</th>
                    <th className="px-4 py-3 text-right">{t('dashboard.files.download')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-onda-lavender/10 bg-white/[0.03]">
                  {filteredFiles.map((file) => (
                    <tr key={file.id}>
                      <td className="px-4 py-4">
                        <div className="flex min-w-64 items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-onda-purple/15 text-onda-lavender">
                            {file.file_type === 'video' || file.file_type === 'reel' ? (
                              <Video className="h-5 w-5" aria-hidden="true" />
                            ) : file.file_type === 'photo' || file.file_type === 'editable' ? (
                              <FileText className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <Music className="h-5 w-5" aria-hidden="true" />
                            )}
                          </span>
                          <span className="font-semibold text-zinc-950 dark:text-white">
                            {file.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-onda-muted">
                        {t(`dashboard.files.filter.${file.file_type}`)}
                      </td>
                      <td className="px-4 py-4 text-onda-muted">
                        {file.project_name ?? t('dashboard.files.noProject')}
                      </td>
                      <td className="px-4 py-4 text-onda-muted">
                        {formatFileSize(file.size_bytes)}
                      </td>
                      <td className="px-4 py-4 text-onda-muted">
                        {uploadDateFormatter.format(new Date(file.uploaded_at))}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-onda-lavender/25 text-onda-lavender transition hover:-translate-y-0.5 hover:bg-onda-purple hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={downloadingFileId === file.id}
                          aria-label={`${t('dashboard.files.download')} ${file.file_name}`}
                        >
                          {downloadingFileId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Download className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
