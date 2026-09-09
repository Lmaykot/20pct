# Redesign de 2026-09-05 — notas de implementação

Fonte do design: `design/20pct-redesign.dc.html` (cópia do projeto Claude Design
"Redesign de aplicativo advocatício", `3e705602-a9c2-4d44-9ace-55ebd3a0e5d7`).

## Vocabulário

Os tokens em `frontend/src/design-system/tokens.css` usam **os nomes curtos do
próprio artboard** (`--bg`, `--panel`, `--acc`, `--ink2`, `--muted2`…) de
propósito: qualquer trecho copiado do arquivo de design funciona sem tradução.
Tipografia: Instrument Sans na interface, JetBrains Mono em todo número, valor,
data e identificador — essa divisão é regra do design, não preferência.

## Arquitetura de rotas

O design implica uma IA diferente da anterior:

| Antes | Agora |
|---|---|
| `/contratos` (lista + formulário na mesma tela) | `/contratos` lista · `/contratos/:id` ficha · `/contratos/novo` e `/contratos/:id/editar` formulário |
| `/relatorio` | virou a ficha do contrato; a rota redireciona para `/contratos` |
| `/export` | virou aba de `/configuracoes`; a rota redireciona |
| busca por página | busca única no header, propagada por `?q=` |

## Decisões que valem registro

- **Sem autenticação.** O artboard não desenha tela de login, então foi
  implementada a *gestão* de usuários (tabela `usuarios`, perfis, escopo,
  convite) sem sessão nem enforcement. As permissões ficam persistidas,
  não impostas. Adicionar login é um passo separado e consciente.
- **Colunas sem dado aparecem com `—`**, nunca preenchidas com invenção:
  "Área" na lista de contratos, "Base de cálculo" na ficha, "Última tratativa"
  na inadimplência, "Último acesso" em usuários, "Histórico" do cliente.
  Se algum desses virar campo real, é só trocar o traço pelo valor.
- **Relatórios financeiros** (`.csv` de recebimentos, `.pdf` de inadimplência)
  estão desenhados em Configurações mas **não têm rota no backend** — os
  cartões aparecem desabilitados com "Ainda não disponível".
- **Baixa de parcela** ganhou endpoint próprio (`POST/DELETE
  /api/parcelas/{id}/baixa`) porque `save_parcelas` apaga e reinsere o
  conjunto inteiro — pesado demais para marcar uma quitação.
- **Agenda vs. editor**: a tela de Pagamentos virou agenda com baixa em um
  clique (como no design), mas o editor de parcelamento continua existindo,
  agora como modal aberto pela hipótese ou por `/pagamentos?h=<honorario_id>`.

## Armadilhas do ambiente

- **Node e Python não estão no PATH** das sessões: `C:\Program Files\nodejs\`
  e `C:\Users\<user>\AppData\Local\Programs\Python\Python312\`. O venv do
  backend fica em `backend/.venv` (gitignorado).
- **Syncthing** espalha arquivos `*.sync-conflict-*` dentro de `src/`. Eles
  quebravam `tsc -b`; o `tsconfig.json` agora os exclui. Vale limpá-los.
- **`frontend/src/types.ts` não está versionado no git** (nunca foi commitado).
  Durante este trabalho o arquivo perdeu o conteúdo original e teve de ser
  reconstruído à mão. Convém commitá-lo.

## O que ficou sem teste automatizado

Não há suíte de testes no projeto. A verificação foi manual, no navegador,
contra um banco de demonstração descartável (claro e escuro, todas as telas,
baixa de parcela ponta a ponta) e depois contra o banco real.
