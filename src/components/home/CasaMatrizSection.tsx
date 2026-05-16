import AssetFrame from '../shared/AssetFrame'
import SectionTitle from '../shared/SectionTitle'

const casaMatrizAssets = [
  { title: 'Freirina 01', src: '/assets/casa-matriz/freirina-01.jpg' },
  { title: 'Freirina 02', src: '/assets/casa-matriz/freirina-02.jpg' },
  { title: 'Estudio', src: '/assets/casa-matriz/estudio-01.jpg' },
  { title: 'Evento', src: '/assets/casa-matriz/evento-01.jpg' },
]

export default function CasaMatrizSection() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <SectionTitle
            eyebrow="Casa matriz"
            title="Freirina como centro de operaciones"
            subtitle="Una base visual lista para mostrar estudio, territorio, eventos y registros de produccion cuando los assets finales esten disponibles."
          />
          <p className="text-sm leading-7 text-zinc-600 dark:text-onda-muted">
            La primera etapa deja preparada la narrativa espacial de ONDA MULTIMEDIA para sumar galeria real, recorridos, backstage y cobertura de proyectos.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {casaMatrizAssets.map((asset) => (
            <AssetFrame key={asset.src} src={asset.src} alt={asset.title} className="aspect-[4/5]">
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(0deg,rgba(5,5,5,0.78),transparent)] p-4">
                <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-white">{asset.title}</p>
              </div>
            </AssetFrame>
          ))}
        </div>
      </div>
    </section>
  )
}
