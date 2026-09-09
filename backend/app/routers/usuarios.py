from fastapi import APIRouter, Depends, HTTPException

from app.database import Database
from app.dependencies import get_db
from app.models import UsuarioCreate, UsuarioResponse, PerfilInfo

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

# Perfis são fixos — o que varia por usuário é o escopo. Essa é a
# regra que a tela de permissões enuncia, então ela mora aqui e não
# numa tabela editável.
PERFIS = [
    PerfilInfo(nome="Sócio", descricao="Vê tudo, define honorários e gere usuários."),
    PerfilInfo(nome="Advogado", descricao="Vê os contratos do próprio escopo e aponta horas."),
    PerfilInfo(nome="Financeiro", descricao="Registra baixas e trata inadimplência; não edita cláusulas."),
    PerfilInfo(nome="Paralegal", descricao="Cadastra clientes e contratos; não vê valores consolidados."),
]

PERFIS_VALIDOS = {p.nome for p in PERFIS}
STATUS_VALIDOS = {"Ativo", "Convite pendente", "Inativo"}


def _row_to_dict(row):
    return dict(row) if row else None


@router.get("/perfis", response_model=list[PerfilInfo])
def list_perfis():
    return PERFIS


@router.get("", response_model=list[UsuarioResponse])
def list_usuarios(db: Database = Depends(get_db)):
    return [_row_to_dict(r) for r in db.get_all_usuarios()]


@router.post("", response_model=UsuarioResponse, status_code=201)
def create_usuario(payload: UsuarioCreate, db: Database = Depends(get_db)):
    _validar(payload)
    uid = db.insert_usuario(
        payload.nome.strip(), payload.email.strip(), payload.perfil,
        payload.escopo.strip(), payload.status)
    return _row_to_dict(db.get_usuario(uid))


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def update_usuario(usuario_id: int, payload: UsuarioCreate, db: Database = Depends(get_db)):
    if not db.get_usuario(usuario_id):
        raise HTTPException(404, "Usuario not found")
    _validar(payload)
    db.update_usuario(
        usuario_id, payload.nome.strip(), payload.email.strip(), payload.perfil,
        payload.escopo.strip(), payload.status)
    return _row_to_dict(db.get_usuario(usuario_id))


@router.delete("/{usuario_id}")
def delete_usuario(usuario_id: int, db: Database = Depends(get_db)):
    if not db.get_usuario(usuario_id):
        raise HTTPException(404, "Usuario not found")
    db.delete_usuario(usuario_id)
    return {"ok": True}


def _validar(payload: UsuarioCreate):
    if not payload.nome.strip():
        raise HTTPException(422, "Nome é obrigatório")
    if payload.perfil not in PERFIS_VALIDOS:
        raise HTTPException(422, f"Perfil inválido: {payload.perfil}")
    if payload.status not in STATUS_VALIDOS:
        raise HTTPException(422, f"Status inválido: {payload.status}")
