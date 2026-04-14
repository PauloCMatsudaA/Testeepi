import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download, RefreshCw, TrendingUp, TrendingDown,
  Minus, Sparkles, FileText, AlertCircle,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { ocorrenciasApi, dashboardApi, relatoriosApi } from '../api/api';
import { PaginaCarregando } from '../components/LoadingSpinner';

// ── Cores do gráfico de pizza ─────────────────────────────────────────────────
const CORES_EPI = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function agruparPorMes(ocorrencias) {
  const meses = {};
  ocorrencias.forEach((o) => {
    const d = new Date(o.timestamp);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    if (!meses[chave]) meses[chave] = { mes: label, total: 0, conformes: 0, naoConformes: 0 };
    meses[chave].total++;
    if (o.status === 'conforme') meses[chave].conformes++;
    else meses[chave].naoConformes++;
  });
  return Object.values(meses)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((m) => ({
      ...m,
      taxaConformidade: m.total > 0 ? Math.round((m.conformes / m.total) * 100) : 100,
    }));
}

function contarEpisAusentes(ocorrencias) {
  const contagem = {};
  ocorrencias
    .filter((o) => o.status === 'nao_conforme' && o.epi_detected)
    .forEach((o) => {
      const epis = Array.isArray(o.epi_detected) ? o.epi_detected : [o.epi_detected];
      epis.forEach((epi) => { contagem[epi] = (contagem[epi] || 0) + 1; });
    });
  return Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([epi, ausencias], i) => ({ epi, ausencias, cor: CORES_EPI[i] }));
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
function TooltipCustom({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="card px-4 py-3 text-xs shadow-md">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}{p.unit || ''}
        </p>
      ))}
    </div>
  );
}

// ── Skeleton de texto ─────────────────────────────────────────────────────────
function SkeletonTexto() {
  return (
    <div className="space-y-2 animate-pulse">
      {[90, 75, 95, 65, 80].map((w, i) => (
        <div
          key={i}
          className="h-3 rounded bg-slate-200"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Relatorios() {
  const [dadosMensais,  setDadosMensais]  = useState([]);
  const [dadosSetor,    setDadosSetor]    = useState([]);
  const [episAusentes,  setEpisAusentes]  = useState([]);
  const [stats,         setStats]         = useState(null);
  const [carregando,    setCarregando]    = useState(true);
  const [gerando,       setGerando]       = useState(false);
  const [analiseIA,     setAnaliseIA]     = useState('');
  const [gerandoIA,     setGerandoIA]     = useState(false);
  const [erroIA,        setErroIA]        = useState('');
  const [erro,          setErro]          = useState('');
  const relatorioRef = useRef(null);

  // ── Carregar dados ──────────────────────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [ocorrRes, statsRes] = await Promise.all([
        ocorrenciasApi.listar({ limit: 300 }),
        dashboardApi.estatisticas(),
      ]);

      const ocorrencias = ocorrRes.data || [];
      const statsData   = statsRes.data;

      setDadosMensais(agruparPorMes(ocorrencias));
      setEpisAusentes(contarEpisAusentes(ocorrencias));
      setStats(statsData);

      const porSetor = (statsData.occurrences_by_sector || []).map((s) => ({
        setor:        s.sector_name,
        conformidade: s.compliance_rate,
        ocorrencias:  s.total,
      }));
      setDadosSetor(porSetor);
    } catch {
      setErro('Não foi possível carregar os dados do relatório.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Gerar análise com IA ────────────────────────────────────────────────────
  async function gerarAnaliseIA() {
    if (dadosMensais.length === 0) return;
    setGerandoIA(true);
    setErroIA('');
    setAnaliseIA('');
    try {
      const res = await relatoriosApi.gerarAnalise({
        conformidade_geral: stats?.compliance_rate ?? 0,
        total_ocorrencias:  stats?.total_occurrences ?? 0,
        dados_mensais:      dadosMensais,
        dados_setor:        dadosSetor,
        epis_ausentes:      episAusentes,
        periodo:            'mensal',
      });
      setAnaliseIA(res.data.analise);
    } catch {
      setErroIA('Não foi possível gerar a análise. Verifique se a API de IA está configurada no servidor.');
    } finally {
      setGerandoIA(false);
    }
  }

  // ── Exportar PDF ────────────────────────────────────────────────────────────
  async function exportarPdf() {
    setGerando(true);
    try {
      const el     = relatorioRef.current;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW   = pdf.internal.pageSize.getWidth();
      const pdfH   = pdf.internal.pageSize.getHeight();
      const imgH   = pdfW / (canvas.width / canvas.height);
      let posY = 0;
      while (posY < imgH) {
        if (posY > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -posY, pdfW, imgH);
        posY += pdfH;
      }
      const data = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      pdf.save(`relatorio-episee-${data}.pdf`);
    } finally {
      setGerando(false);
    }
  }

  // ── Gerar análise IA e depois exportar PDF ──────────────────────────────────
  async function exportarComIA() {
    await gerarAnaliseIA();
    await exportarPdf();
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (carregando) return <PaginaCarregando />;

  const conformidadeAtual = stats?.compliance_rate ?? 0;
  const totalOcorrencias  = stats?.total_occurrences ?? 0;

  return (
    <div className="pg-wide">

      {/* ── Controles ─────────────────────────────────────────────────────── */}
      <div className="row-between flex-wrap gap-3">
        {erro && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={14} /> {erro}
          </div>
        )}
        <div className="row gap-2 ml-auto">
          <button
            onClick={carregarDados}
            className="btn-ghost btn gap-2"
          >
            <RefreshCw size={15} /> Atualizar
          </button>
          <button
            onClick={gerarAnaliseIA}
            disabled={gerandoIA || carregando || dadosMensais.length === 0}
            className="btn btn-ghost gap-2 border border-brand text-brand hover:bg-brand/10 disabled:opacity-50"
          >
            {gerandoIA
              ? <RefreshCw size={15} className="animate-spin" />
              : <Sparkles size={15} />}
            {gerandoIA ? 'Analisando...' : 'Análise IA'}
          </button>
          <button
            onClick={exportarComIA}
            disabled={gerando || gerandoIA || carregando}
            className="btn-primary btn disabled:opacity-60"
          >
            {gerando
              ? <RefreshCw size={15} className="animate-spin" />
              : <Download size={15} />}
            {gerando ? 'Gerando PDF...' : 'Exportar com IA'}
          </button>
          <button
            onClick={exportarPdf}
            disabled={gerando || gerandoIA || carregando}
            className="btn btn-ghost disabled:opacity-60"
            title="Exportar PDF sem análise IA"
          >
            <FileText size={15} />
          </button>
        </div>
      </div>

      {/* ── Conteúdo capturado pelo PDF ────────────────────────────────────── */}
      <div ref={relatorioRef} className="space-y-6 rounded-xl bg-white p-2">

        {/* Cabeçalho */}
        <div className="card p-5 row-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Relatório de Conformidade EPI</h2>
            <p className="sec-sub mt-1">
              Total de ocorrências: {totalOcorrencias.toLocaleString('pt-BR')} ·
              Gerado em: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand">{conformidadeAtual}%</p>
            <p className="sec-sub text-xs">Conformidade geral</p>
          </div>
        </div>

        {/* ── Análise IA ──────────────────────────────────────────────────── */}
        {(analiseIA || gerandoIA || erroIA) && (
          <div className={erroIA ? 'alert-warn' : 'alert-ok'}>
            <div className="shrink-0 mt-0.5">
              {gerandoIA
                ? <RefreshCw size={18} className="animate-spin" />
                : erroIA
                  ? <AlertCircle size={18} />
                  : <Sparkles size={18} />}
            </div>
            <div className="w-full space-y-2">
              <p className="font-semibold text-sm">
                {erroIA
                  ? 'Erro na Análise IA'
                  : gerandoIA
                    ? 'Gerando análise com IA...'
                    : 'Análise Gerada por Inteligência Artificial'}
              </p>
              {gerandoIA
                ? <SkeletonTexto />
                : erroIA
                  ? <p className="text-sm">{erroIA}</p>
                  : analiseIA.split('\n\n').filter(Boolean).map((paragrafo, i) => (
                      <p key={i} className="text-sm leading-relaxed">{paragrafo}</p>
                    ))}
            </div>
          </div>
        )}

        {/* ── Gráficos: linha + barra ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* Linha — tendência mensal */}
          <div className="card p-5">
            <h3 className="sec-title mb-4">Tendência Mensal de Conformidade</h3>
            {dadosMensais.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-400">
                Sem dados mensais ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dadosMensais}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip content={<TooltipCustom />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="taxaConformidade"
                    name="Conformidade"
                    stroke="#22C55E"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    unit="%"
                  />
                  <Line
                    type="monotone"
                    dataKey="naoConformes"
                    name="Não Conformes"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Barra — por setor */}
          <div className="card p-5">
            <h3 className="sec-title mb-4">Conformidade por Setor</h3>
            {dadosSetor.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-400">
                Sem dados por setor ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dadosSetor} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <YAxis
                    dataKey="setor"
                    type="category"
                    width={110}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<TooltipCustom />} />
                  <Bar
                    dataKey="conformidade"
                    name="Conformidade"
                    fill="#F97316"
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                    unit="%"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── EPIs ausentes ──────────────────────────────────────────────────── */}
        {episAusentes.length > 0 && (
          <div className="card p-5">
            <h3 className="sec-title mb-4">EPIs com Maior Índice de Ausência</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={episAusentes}
                    dataKey="ausencias"
                    nameKey="epi"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    {episAusentes.map((e, i) => (
                      <Cell key={i} fill={e.cor} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-slate-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Lista de EPIs */}
              <div className="space-y-3 self-center">
                {episAusentes.map((e) => (
                  <div key={e.epi} className="row-between gap-3">
                    <div className="row gap-2 min-w-0">
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: e.cor }}
                      />
                      <span className="truncate text-sm text-slate-700">{e.epi}</span>
                    </div>
                    <div className="row gap-2 shrink-0">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(e.ausencias / episAusentes[0].ausencias) * 100}%`,
                            backgroundColor: e.cor,
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-medium text-slate-600">
                        {e.ausencias}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tabela mensal ──────────────────────────────────────────────────── */}
        {dadosMensais.length > 0 && (
          <div className="card">
            <div className="card-header">
              <FileText size={16} className="text-slate-400" />
              <h3 className="sec-title">Resumo Mensal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Mês', 'Total', 'Conformes', 'Não Conformes', 'Taxa'].map((h) => (
                      <th key={h} className="tbl-th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosMensais.map((d) => (
                    <tr key={d.mes} className="tbl-tr">
                      <td className="tbl-td font-medium">{d.mes}</td>
                      <td className="tbl-td">{d.total}</td>
                      <td className="tbl-td font-medium text-ok">{d.conformes}</td>
                      <td className="tbl-td text-err">{d.naoConformes}</td>
                      <td className="tbl-td">
                        <span className={d.taxaConformidade >= 93 ? 'badge-ok badge' : 'badge-warn badge'}>
                          {d.taxaConformidade}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estado vazio */}
        {!carregando && dadosMensais.length === 0 && dadosSetor.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FileText size={48} className="mb-4 text-slate-200" />
            <p className="text-sm font-medium">Nenhum dado de ocorrência encontrado.</p>
            <p className="mt-1 text-xs">
              Os gráficos serão preenchidos conforme as detecções forem registradas.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
