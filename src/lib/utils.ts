export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export const whatsappQuoteUrl =
  'https://wa.me/56954546129?text=Hola%2C%20quiero%20cotizar%20un%20proyecto%20con%20Onda%20Multimedia.'
