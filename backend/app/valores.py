"""Leitura dos valores monetários e das datas guardadas como texto.

Os campos `valor` de honorarios e parcelas são digitados à mão, então
convivem no banco o número cru ("2000") e o formato brasileiro
("R$ 1.234,56"). Todo agregado do painel passa por aqui.
"""

import re
from datetime import date, datetime

_NAO_NUMERICO = re.compile(r'[^\d,.\-]')


def parse_valor(texto) -> float:
    """Converte o valor textual em float. Devolve 0.0 no que não for legível."""
    if texto is None:
        return 0.0
    if isinstance(texto, (int, float)):
        return float(texto)

    limpo = _NAO_NUMERICO.sub('', str(texto)).strip()
    if not limpo:
        return 0.0

    tem_virgula = ',' in limpo
    tem_ponto = '.' in limpo

    if tem_virgula and tem_ponto:
        # "1.234,56" — ponto é milhar, vírgula é decimal.
        limpo = limpo.replace('.', '').replace(',', '.')
    elif tem_virgula:
        # "1234,56" ou "1.234" digitado com vírgula decimal.
        limpo = limpo.replace(',', '.')
    elif tem_ponto:
        # Ambíguo: "1.234" é milhar, "1234.56" é decimal. Só tratamos
        # como milhar quando o último grupo tem exatamente 3 dígitos.
        partes = limpo.split('.')
        if len(partes) > 1 and all(len(p) == 3 for p in partes[1:]):
            limpo = ''.join(partes)

    try:
        return float(limpo)
    except ValueError:
        return 0.0


def formatar_brl(valor: float) -> str:
    """1234.5 -> 'R$ 1.234,50'."""
    inteiro = f'{abs(valor):,.2f}'.replace(',', '_').replace('.', ',').replace('_', '.')
    sinal = '-' if valor < 0 else ''
    return f'{sinal}R$ {inteiro}'


def parse_data(texto):
    """Aceita ISO (YYYY-MM-DD) e BR (DD/MM/YYYY). Devolve date ou None."""
    if not texto:
        return None
    texto = str(texto).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y-%m-%dT%H:%M:%S'):
        try:
            return datetime.strptime(texto[:len(fmt) + 2].strip(), fmt).date()
        except ValueError:
            continue
    return None


def dias_de_atraso(vencimento, hoje: date | None = None) -> int:
    """Dias corridos desde o vencimento. Zero se ainda não venceu."""
    d = parse_data(vencimento)
    if d is None:
        return 0
    hoje = hoje or date.today()
    return max(0, (hoje - d).days)
