import { useState, useMemo } from 'react';
import { Filter, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import TabelaOcorrencias from '../components/OccurrenceTable';
import BadgeStatus from '../components/AlertBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Mock Data ────────────────────────────────────────────────────────────────
// TODO: await occurrencesAPI.list(params)

const sectors = ['Todos', 'Montagem A', 'Soldagem', 'Pintura', 'Almoxarifado', 'Expedição', 'Manutenção'];
const statuses = [
  { value: 'todos', label: 'Todos' },
  { value: 'ok', label: 'Conforme' },
  { value: 'err', label: 'Não Conforme' },
];

function generateMockOccurrences() {
  const cameras = ['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04', 'CAM-05', 'CAM-06', 'CAM-07', 'CAM-08'];
  const sectorsList = ['Montagem A', 'Soldagem', 'Pintura', 'Almoxarifado', 'Expedição', 'Manutenção'];
  const epiTypes = ['Capacete', 'Óculos', 'Luva', 'Bota', 'Máscara', 'Protetor Auricular', 'Avental', 'Cinto de Segurança'];

  return Array.from({ length: 87 }, (_, i) => {
    const id = 1247 - i;
    const sectorIdx = Math.floor(Math.random() * sectorsList.length);
    const numEpis = Math.floor(Math.random() * 3) + 1;
    const epis = [...new Set(Array.from({ length: numEpis }, () => epiTypes[Math.floor(Math.random() * epiTypes.length)]))];
    const isCompliant = Math.random() > 0.18;
    const date = new Date(2024, 9, 15 - Math.floor(i / 8), 8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

    return {
      id,
      camera: cameras[Math.floor(Math.random() * cameras.length)],
      sector: sectorsList[sectorIdx],
      epis,
      status: isCompliant ? 'ok' : 'err',
      confidence: Number((85 + Math.random() * 14.5).toFixed(1)),
      datetime: date.toISOString(),
      worker: `Trabalhador ${100 + Math.floor(Math.random() * 200)}`,
      imageUrl: null,
      notes: isCompliant ? '' : 'Falta de EPI detectada pela câmera.',
    };
  });
}

const allOccurrences = generateMockOccurrences();

export default function Occurrences() {
  const [sectorFilter, setSectorFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOccurrence, setSelectedOccurrence] = useState(null);
  const perPage = 10;

  const filtered = useMemo(() => {
    return allOccurrences.filter((occ) => {
      if (sectorFilter !== 'Todos' && occ.sector !== sectorFilter) return false;
      if (statusFilter !== 'todos' && occ.status !== statusFilter) return false;
      if (startDate && new Date(occ.datetime) < new Date(startDate)) return false;
      if (endDate && new Date(occ.datetime) > new Date(endDate + 'T23:59:59')) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          occ.camera.toLowerCase().includes(term) ||
          occ.sector.toLowerCase().includes(term) ||
          occ.epis.some((e) => e.toLowerCase().includes(term)) ||
          String(occ.id).includes(term)
        );
      }
      return true;
    });
  }, [sectorFilter, statusFilter, startDate, endDate, searchTerm]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const clearFilters = () => {
    setSectorFilter('Todos');
    setStatusFilter('todos');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Setor</label>
            <select
              value={sectorFilter}
              onChange={(e) => { setSectorFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            >
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">De</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand"
            />
          </div>

          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={14} />
            Limpar
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs text-slate-400">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <TabelaOcorrencias
          occurrences={paginated}
          onViewDetails={setSelectedOccurrence}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-400">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-brand text-white'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOccurrence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl fade-in">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Ocorrência #{String(selectedOccurrence.id).padStart(4, '0')}
              </h3>
              <button
                onClick={() => setSelectedOccurrence(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Câmera</p>
                  <p className="text-sm font-medium text-slate-700">{selectedOccurrence.camera}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Setor</p>
                  <p className="text-sm font-medium text-slate-700">{selectedOccurrence.sector}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Data/Hora</p>
                  <p className="text-sm font-medium text-slate-700">
                    {format(new Date(selectedOccurrence.datetime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Confiança</p>
                  <p className="text-sm font-medium text-slate-700">{selectedOccurrence.confidence}%</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400">Status</p>
                <div className="mt-1">
                  <BadgeStatus status={selectedOccurrence.status} size="md" />
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400">EPIs Detectados</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedOccurrence.epis.map((epi, i) => (
                    <span key={i} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {epi}
                    </span>
                  ))}
                </div>
              </div>

              {selectedOccurrence.notes && (
                <div>
                  <p className="text-xs text-slate-400">Observações</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedOccurrence.notes}</p>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Trabalhador Identificado</p>
                <p className="text-sm font-medium text-slate-700">{selectedOccurrence.worker}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedOccurrence(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
