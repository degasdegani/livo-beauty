// Validacao de CPF/CNPJ por digito verificador (modulo 11), sem dependencia
// externa. Segue a convencao ja usada no projeto pra telefone: a funcao
// recebe digitos ja normalizados (input formatado e limpo com
// `.replace(/\D/g, "")` no ponto de entrada, ex: server action), nao faz a
// normalizacao ela mesma.

function hasAllSameDigits(digits: string): boolean {
  return digits.split("").every((d) => d === digits[0])
}

function calcCheckDigit(digits: string, weights: number[]): number {
  const sum = digits
    .split("")
    .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0)
  const remainder = sum % 11
  return remainder < 2 ? 0 : 11 - remainder
}

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || hasAllSameDigits(digits)) return false

  const firstCheck = calcCheckDigit(
    digits.slice(0, 9),
    [10, 9, 8, 7, 6, 5, 4, 3, 2]
  )
  const secondCheck = calcCheckDigit(
    digits.slice(0, 9) + firstCheck,
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
  )

  return digits === digits.slice(0, 9) + String(firstCheck) + String(secondCheck)
}

function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || hasAllSameDigits(digits)) return false

  const firstCheck = calcCheckDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  )
  const secondCheck = calcCheckDigit(
    digits.slice(0, 12) + firstCheck,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  )

  return digits === digits.slice(0, 12) + String(firstCheck) + String(secondCheck)
}

/** Recebe apenas digitos (11 = CPF, 14 = CNPJ) e valida o digito verificador. */
export function isValidCpfCnpj(digitsOnly: string): boolean {
  if (digitsOnly.length === 11) return isValidCpf(digitsOnly)
  if (digitsOnly.length === 14) return isValidCnpj(digitsOnly)
  return false
}
