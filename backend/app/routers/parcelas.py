from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from app.database import Database
from app.dependencies import get_db
from app.models import ParcelaResponse, ParcelasPayload

router = APIRouter(prefix="/api/honorarios/{honorario_id}/parcelas", tags=["parcelas"])


def _row_to_dict(row):
    return dict(row) if row else None


@router.get("", response_model=list[ParcelaResponse])
def get_parcelas(honorario_id: int, db: Database = Depends(get_db)):
    rows = db.get_parcelas(honorario_id)
    return [_row_to_dict(r) for r in rows]


@router.put("")
def save_parcelas(honorario_id: int, data: ParcelasPayload, db: Database = Depends(get_db)):
    parcelas = [
        {
            'num': p.num,
            'valor': p.valor,
            'vencimento': p.vencimento,
            'nota_fiscal': p.nota_fiscal,
            'data_pagamento': p.data_pagamento,
        }
        for p in data.parcelas
    ]
    db.save_parcelas(honorario_id, parcelas)
    return {"ok": True}


# Router separado: baixa individual, endereçada pelo id da parcela.
baixas_router = APIRouter(prefix="/api/parcelas", tags=["parcelas"])


@baixas_router.post("/{parcela_id}/baixa", response_model=ParcelaResponse)
def registrar_baixa(parcela_id: int, db: Database = Depends(get_db)):
    if not db.get_parcela(parcela_id):
        raise HTTPException(404, "Parcela not found")
    db.set_parcela_pagamento(parcela_id, date.today().isoformat())
    return _row_to_dict(db.get_parcela(parcela_id))


@baixas_router.delete("/{parcela_id}/baixa", response_model=ParcelaResponse)
def estornar_baixa(parcela_id: int, db: Database = Depends(get_db)):
    if not db.get_parcela(parcela_id):
        raise HTTPException(404, "Parcela not found")
    db.set_parcela_pagamento(parcela_id, '')
    return _row_to_dict(db.get_parcela(parcela_id))
