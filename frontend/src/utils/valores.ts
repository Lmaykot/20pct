/** Espelho do `backend/app/valores.py`: os valores chegam como texto
 *  livre ("2000", "R$ 1.234,56") e às vezes precisam ser somados aqui. */

export function parseValor(texto: string | number | null | undefined): number {
  if (texto === null || texto === undefined) return 0
  if (typeof texto === 'number') return texto

  const limpo = String(texto).replace(/[^\d,.-]/g, '').trim()
  if (!limpo) return 0

  const temVirgula = limpo.includes(',')
  const temPonto = limpo.includes('.')

  let normalizado = limpo
  if (temVirgula && temPonto) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.')
  } else if (temVirgula) {
    normalizado = limpo.replace(',', '.')
  } else if (temPonto) {
    // "1.234" é milhar; "1234.56" é decimal.
    const partes = limpo.split('.')
    if (partes.length > 1 && partes.slice(1).every(p => p.length === 3)) {
      normalizado = partes.join('')
    }
  }

  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}

export function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

/** Data ISO (YYYY-MM-DD) para o formato curto do design. */
export function dataCurta(iso: string): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}`
}

export function dataLonga(iso: string): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}
