import { useState } from 'react';
import { Check, X, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import BadgeStatus from '../components/AlertBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Mock Data ────────────────────────────────────────────────────────────────
// TODO: await epiRequestsAPI.list(params)

const initialRequests = [
  { id: 1, worker: 'João Mendes', sector: 'Montagem A', epi: 'Capacete MSA V-Gard', reason: 'Desgaste no casco — rachadura visível', date: '2024-10-15T09:30:00', status: 'pendente' },
  { id: 2, worker: 'Maria Costa', sector: 'Soldagem', epi: 'Luva de Couro Cano Longo', reason: 'Furos nos dedos — perda de proteção', date: '2024-10-15T10:15:00', status: 'pendente' },
  { id: 3, worker: 'Pedro Alves', sector: 'Pintura', epi: 'Máscara PFF2', reason: 'Válvula de expiração danificada', date: '2024-10-15T08:45:00', status: 'pendente' },
  { id: 4, worker: 'Ana Souza', sector: 'Manutenção', epi: 'Óculos de Proteção Ampla Visão', reason: 'Lente riscada — comprometimento visual', date: '2024-10-14T16:20:00', status: 'pendente' },
  { id: 5, worker: 'Carlos Lima', sector: 'Almoxarifado', epi: 'Bota de Segurança', reason: 'Solado descolando — sem aderência', date: '2024-10-14T14:00:00', status: 'pendente' },
  { id: 6, worker: 'Lucas Ferreira', sector: 'Expedição', epi: 'Protetor Auricular Tipo Concha', reason: 'Almofada auricular desgastada', date: '2024-10-14T11:30:00', status: 'aprovado' },
  { id: 7, worker: 'Fernanda Rocha', sector: 'Soldagem', epi: 'Avental de Raspa', reason: 'Cortes extensos no avental', date: '2024-10-13T15:00:00', status: 'aprovado' },
  { id: 8, worker: 'Roberto Santos', sector: 'Montagem A', epi: 'Cinto de Segurança Paraquedista', reason: 'Revisão periódica — 6 meses de uso', date: '2024-10-13T10:00:00', status: 'aprovado' },
  { id: 9, worker: 'Juliana Martins', sector: 'Pintura', epi: 'Capacete MSA V-Gard', reason: 'Extravio — não encontrado no setor', date: '2024-10-12T09:00:00', status: 'rejeitado' },
  { id: 10, worker: 'Diego Oliveira', sector: 'Manutenção', epi: 'Luva de Borracha Isolante', reason: 'Solicitação duplicada', date: '2024-10-12T08:15:00', status: 'rejeitado' },
];

const tabs = [
  { id: 'pendente', label: 'Pendentes', icon: Clock, color: 'text-warn' },
  { id: 'aprovado', label: 'Aprovadas', icon: CheckCircle, color: 'text-ok' },
  { id: 'rejeitado', label: 'Rejeitadas', icon: XCircle, color: 'text-err' },
];

export default function EpiRequests() {
  const [requests, setRequests] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState('pendente');
  const [confirmModal, setConfirmModal] = useState(null); // { id, action }

  const filtered = requests.filter((r) => r.status === activeTab);
  const counts = {
    pendente: requests.filter((r) => r.status === 'pendente').length,
    aprovado: requests.filter((r) => r.status === 'aprovado').length,
    rejeitado: requests.filter((r) => r.status === 'rejeitado').length,
  };

  const handleAction = (id, action) => {
    setConfirmModal({ id, action });
  };

  const confirmAction = () => {
    if (!confirmModal) return;
    const { id, action } = confirmModal;

    // TODO: await epiRequestsAPI.approve(id) or epiRequestsAPI.reject(id)
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action === 'approve' ? 'aprovado' : 'rejeitado' } : r))
    );
    setConfirmModal(null);
  };

  const requestForModal = confirmModal ? requests.find((r) => r.id === confirmModal.id) : null;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-100 bg-white p-1 shadow-sm">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <AlertCircle size={40} className="mb-3 text-slate-300" />
            <p className="text-sm">Nenhuma solicitação {activeTab === 'pendente' ? 'pendente' : activeTab === 'aprovado' ? 'aprovada' : 'rejeitada'}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Trabalhador</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Setor</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">EPI Solicitado</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 hidden md:table-cell">Motivo</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Data</th>
                  <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
                  {activeTab === 'pendente' && (
                    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((req) => (
                  <tr key={req.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{req.worker}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{req.sector}</td>
                    <td className="px-4 py-3 text-slate-700">{req.epi}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell max-w-xs truncate">{req.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {format(new Date(req.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <BadgeStatus status={req.status} />
                    </td>
                    {activeTab === 'pendente' && (
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAction(req.id, 'approve')}
                            className="flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                          >
                            <Check size={14} />
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'reject')}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
                          >
                            <X size={14} />
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && requestForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl fade-in">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                confirmModal.action === 'approve' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {confirmModal.action === 'approve' ? (
                  <Check size={20} className="text-green-600" />
                ) : (
                  <X size={20} className="text-red-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {confirmModal.action === 'approve' ? 'Aprovar Solicitação' : 'Rejeitar Solicitação'}
                </h3>
                <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p><span className="font-medium text-slate-600">Trabalhador:</span> {requestForModal.worker}</p>
              <p><span className="font-medium text-slate-600">EPI:</span> {requestForModal.epi}</p>
              <p><span className="font-medium text-slate-600">Motivo:</span> {requestForModal.reason}</p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAction}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  confirmModal.action === 'approve'
                    ? 'bg-ok hover:bg-green-600 shadow-sm'
                    : 'bg-err hover:bg-red-600 shadow-sm'
                }`}
              >
                {confirmModal.action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
