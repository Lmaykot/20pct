import { api } from './client'
import type { Parcela } from '../types'

export const parcelasApi = {
  get: (honorarioId: number) => api.get<Parcela[]>(`/honorarios/${honorarioId}/parcelas`),
  save: (honorarioId: number, parcelas: { num: number; valor: string; vencimento: string; nota_fiscal: string; data_pagamento: string }[]) =>
    api.put<{ ok: boolean }>(`/honorarios/${honorarioId}/parcelas`, { parcelas }),
}

export const baixasApi = {
  registrar: (parcelaId: number) => api.post<Parcela>(`/parcelas/${parcelaId}/baixa`, {}),
  estornar: (parcelaId: number) => api.del<Parcela>(`/parcelas/${parcelaId}/baixa`),
}
