import CTAButton from '../shared/CTAButton'

export default function EventForm() {
  return (
    <form className="glass-panel grid gap-4 rounded-lg p-5" onSubmit={(event) => event.preventDefault()}>
      <h3 className="font-display text-lg font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
        Nuevo evento
      </h3>
      <input
        type="text"
        placeholder="Nombre del evento"
        className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none focus:border-onda-purple dark:bg-white/5"
      />
      <input
        type="text"
        placeholder="Fecha"
        className="h-12 rounded-md border border-onda-purple/20 bg-white/70 px-4 outline-none focus:border-onda-purple dark:bg-white/5"
      />
      <textarea
        placeholder="Descripcion breve"
        rows={4}
        className="rounded-md border border-onda-purple/20 bg-white/70 px-4 py-3 outline-none focus:border-onda-purple dark:bg-white/5"
      />
      <CTAButton type="submit" variant="secondary">
        Guardar borrador
      </CTAButton>
    </form>
  )
}
