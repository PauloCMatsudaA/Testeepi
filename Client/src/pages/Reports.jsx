import { useState, useRef } from 'react';
import { FileText, Download, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ── Mock data ─────────────────────────────────────────────────────────────────

const dadosMensais = [
  { mes: 'Mai', conformes: 88, naoConformes: 12, total: 450 },
  { mes: 'Jun', conformes: 90, naoConformes: 10, total: 480 },
  { mes: 'Jul', conformes: 87, naoConformes: 13, total: 510 },
  { mes: 'Ago', conformes: 92, naoConformes: 8,  total: 495 },
  { mes: 'Set', conformes: 91, naoConformes: 9,  total: 520 },
  { mes: 'Out', conformes: 94, naoConformes: 6,  total: 540 },
];

const dadosSetor = [
  { setor: 'Montagem A',   conformidade: 93, ocorrencias: 342 },
  { setor: 'Soldagem',     conformidade: 90, ocorrencias: 286 },
  { setor: 'Pintura',      conformidade: 95, ocorrencias: 198 },
  { setor: 'Almoxarifado', conformidade: 96, ocorrencias: 156 },
  { setor: 'Expedição',    conformidade: 97, ocorrencias: 132 },
  { setor: 'Manutenção',   conformidade: 88, ocorrencias: 133 },
];

const episAusentes = [
  { epi: 'Capacete',             ausencias: 87, cor: '#EF4444' },
  { epi: 'Luvas',                ausencias: 64, cor: '#F97316' },
  { epi: 'Óculos de proteção',   ausencias: 43, cor: '#EAB308' },
  { epi: 'Bota de segurança',    ausencias: 28, cor: '#22C55E' },
  { epi: 'Protetor auricular',   ausencias: 19, cor: '#3B82F6' },
];

// ── Análise automática ────────────────────────────────────────────────────────

function gerarAnalise(dados) {
  const ultimo    = dados[dados.length - 1];
  const anterior  = dados[dados.length - 2];
  const tendencia = ultimo.conformes - anterior.conformes;
  const media     = (dados.reduce((s, d) => s + d.conformes, 0) / dados.length).toFixed(1);
  const pico      = Math.max(...dados.map((d) => d.conformes));
  const vale      = Math.min(...dados.map((d) => d.conformes));

  const positivo = tendencia >= 0;
  const excelente = ultimo.conformes >= 93;

  const linhas = [
    positivo
      ? `✅ A conformidade apresentou melhora de ${tendencia.toFixed(1)}pp em relação ao mês anterior, atingindo ${ultimo.conformes}% em ${ultimo.mes}.`
      : `⚠️ A conformidade recuou ${Math.abs(tendencia).toFixed(1)}pp em relação ao mês anterior, chegando a ${ultimo.conformes}% em ${ultimo.mes}.`,
    `📊 A média do período analisado foi de ${media}%, com pico de ${pico}% e mínima de ${vale}%.`,
    excelente
      ? `🎯 O desempenho atual é considerado excelente (acima de 93%), indicando boa adesão ao uso de EPIs.`
      : `🔍 O índice atual está abaixo do patamar recomendado de 93%. Recomenda-se reforçar o treinamento nos setores críticos.`,
    `💡 O EPI com maior índice de ausência no período foi o Capacete (${episAusentes[0].ausencias} registros). Recomenda-se ação focada neste item.`,
    positivo && excelente
      ? `🏆 Considerando a tendência de alta e o bom desempenho, o cenário é favorável. Manter os controles atuais e replicar as boas práticas para setores com conformidade abaixo de 90%.`
      : `📋 Ação recomendada: realizar auditoria nos setores Soldagem e Manutenção, que apresentam as menores taxas de conformidade do período.`,
  ];

  return { linhas, positivo, tendencia };
}

// ── Tooltip customizado ───────────────────────────────────────────────────────

function Tooltip2({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="card px-4 py-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.unit || ''}</p>
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Relatorios() {
  const [periodo,    setPeriodo]    = useState('mensal');
  const [gerando,    setGerando]    = useState(false);
  const relatorioRef                = useRef(null);
  const analise                     = gerarAnalise(dadosMensais);

  async function gerarPdf() {
    setGerando(true);
    try {
      const el      = relatorioRef.current;
      const canvas  = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW   = pdf.internal.pageSize.getWidth();
      const pdfH   = pdf.internal.pageSize.getHeight();
      const ratio  = canvas.width / canvas.height;
      const imgH   = pdfW / ratio;

      // Quebra em múltiplas páginas se necessário
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

  return (
    <div className="pg-wide">
      {/* Controles */}
      <div className="row-between flex-wrap gap-3">
        <div className="row gap-2">
          {['mensal', 'trimestral', 'anual'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={periodo === p
                ? 'btn btn-sm bg-brand text-white'
                : 'btn btn-sm btn-ghost'}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="row gap-2">
          <button className="btn-ghost btn gap-2">
            <RefreshCw size={15} /> Atualizar
          </button>
          <button
            onClick={gerarPdf}
            disabled={gerando}
            className="btn-primary btn disabled:opacity-60"
          >
            {gerando ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            {gerando ? 'Gerando PDF...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Conteúdo do relatório (capturado pelo html2canvas) */}
      <div ref={relatorioRef} className="space-y-6 bg-white p-2 rounded-xl">

        {/* Cabeçalho do relatório */}
        <div className="card p-5 row-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Relatório de Conformidade EPI</h2>
            <p className="sec-sub mt-1">
              Período: {periodo.charAt(0).toUpperCase() + periodo.slice(1)} ·
              Gerado em: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-brand">
              {dadosMensais[dadosMensais.length - 1].conformes}%
            </p>
            <p className="sec-sub text-xs">Conformidade atual</p>
          </div>
        </div>

        {/* Análise automática */}
        <div className={analise.positivo ? 'alert-ok' : 'alert-warn'}>
          <div className="shrink-0 mt-0.5">
            {analise.tendencia > 0
              ? <TrendingUp size={18} />
              : analise.tendencia < 0
                ? <TrendingDown size={18} />
                : <Minus size={18} />}
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-sm mb-2">Análise Automática do Período</p>
            {analise.linhas.map((linha, i) => (
              <p key={i} className="text-sm">{linha}</p>
            ))}
          </div>
        </div>

        {/* Gráficos — linha */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="card p-5">
            <h3 className="sec-title mb-4">Tendência de Conformidade</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dadosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<Tooltip2 />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="conformes"    name="Conformes"     stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="naoConformes" name="Não Conformes" stroke="#EF4444" strokeWidth={2}   dot={{ r: 3 }} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="sec-title mb-4">Conformidade por Setor</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dadosSetor} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[80, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                <YAxis dataKey="setor" type="category" width={90} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tooltip2 />} />
                <Bar dataKey="conformidade" name="Conformidade %" fill="#F97316" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* EPIs ausentes */}
        <div className="card p-5">
          <h3 className="sec-title mb-4">EPIs com Maior Índice de Ausência</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={episAusentes} dataKey="ausencias" nameKey="epi" cx="50%" cy="50%" outerRadius={90} label={({ epi, percent }) => `${epi} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {episAusentes.map((e, i) => <Cell key={i} fill={e.cor} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {episAusentes.map((e) => (
                <div key={e.epi} className="row-between">
                  <div className="row gap-2">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: e.cor }} />
                    <span className="text-sm text-slate-700">{e.epi}</span>
                  </div>
                  <div className="row gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${(e.ausencias / episAusentes[0].ausencias) * 100}%`, backgroundColor: e.cor }} />
                    </div>
                    <span className="w-8 text-right text-xs font-medium text-slate-600">{e.ausencias}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela mensal */}
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
                    <td className="tbl-td text-ok font-medium">{Math.round(d.total * d.conformes / 100)}</td>
                    <td className="tbl-td text-err">{Math.round(d.total * d.naoConformes / 100)}</td>
                    <td className="tbl-td">
                      <span className={d.conformes >= 93 ? 'badge-ok badge' : 'badge-warn badge'}>{d.conformes}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
