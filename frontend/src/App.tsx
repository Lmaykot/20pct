import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { Painel } from './pages/Painel'
import { Contratos } from './pages/Contratos'
import { ContratoDetalhe } from './pages/ContratoDetalhe'
import { CadastroContrato } from './pages/CadastroContrato'
import { CadastroCliente } from './pages/CadastroCliente'
import { GestaoPagamentos } from './pages/GestaoPagamentos'
import { Inadimplentes } from './pages/Inadimplentes'
import { Configuracoes } from './pages/Configuracoes'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/painel" element={<Painel />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/contratos/novo" element={<CadastroContrato />} />
          <Route path="/contratos/:id/editar" element={<CadastroContrato />} />
          <Route path="/contratos/:id" element={<ContratoDetalhe />} />
          <Route path="/clientes" element={<CadastroCliente />} />
          <Route path="/pagamentos" element={<GestaoPagamentos />} />
          <Route path="/inadimplentes" element={<Inadimplentes />} />
          <Route path="/configuracoes" element={<Configuracoes />} />

          {/* Rotas da IA anterior — o relatório virou a ficha do
              contrato e a exportação virou uma aba de configurações. */}
          <Route path="/relatorio" element={<Navigate to="/contratos" replace />} />
          <Route path="/export" element={<Navigate to="/configuracoes" replace />} />
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
