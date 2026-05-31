export const ACCESS_CODE_LENGTH = 6
export const ACCESS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string) {
  return uuidPattern.test(value.trim())
}

export function normalizeAccessCode(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

export function createAccessCode() {
  const randomValues = new Uint32Array(ACCESS_CODE_LENGTH)

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(randomValues)
  } else {
    for (let index = 0; index < randomValues.length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length)
    }
  }

  return Array.from(randomValues, (value) => ACCESS_CODE_ALPHABET[value % ACCESS_CODE_ALPHABET.length]).join('')
}
