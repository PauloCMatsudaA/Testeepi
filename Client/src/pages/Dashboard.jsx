import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { AlertTriangle, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import CartaoEstatistica from '../components/StatCard';
import TabelaOcorrencias from '../components/OccurrenceTable';

// ─── Dados mock (substituir por dashboardApi.* quando backend estiver rodando) ─

const estatisticasMock = {
  totalOcorrencias:    1247,
  taxaConformidade:    94.2,
  naoConformesHoje:    8,
  solicitacoesPendentes: 12,
  tendencias: {
    totalOcorrencias:    5.3,
    taxaConformidade:    2.1,
    naoConformesHoje:    -15.4,
    solicitacoesPendentes: -8.2,
  },
};

const tendenciaConformidadeMock = [
  { dia: 'Seg', conformidade: 91, naoConformidade: 9  },
  { dia: 'Ter', conformidade: 93, naoConformidade: 7  },
  { dia: 'Qua', conformidade: 89, naoConformidade: 11 },
  { dia: 'Qui', conformidade: 95, naoConformidade: 5  },
  { dia: 'Sex', conformidade: 94, naoConformidade: 6  },
  { dia: 'Sáb', conformidade: 96, naoConformidade: 4  },
  { dia: 'Dom', conformidade: 94, naoConformidade: 6  },
];

const ocorrenciasPorSetorMock = [
  { setor: 'Montagem A',    total: 342, ok: 318, naoConformes: 24 },
  { setor: 'Soldagem',      total: 286, ok: 258, naoConformes: 28 },
  { setor: 'Pintura',       total: 198, ok: 189, naoConformes: 9  },
  { setor: 'Almoxarifado',  total: 156, ok: 150, naoConformes: 6  },
  { setor: 'Expedição',     total: 132, ok: 128, naoConformes: 4  },
  { setor: 'Manutenção',    total: 133, ok: 118, naoConformes: 15 },
];

const ocorrenciasRecentesMock = [
  { id: 1243, camera: 'CAM-01', sector: 'Montagem A',  epis: ['Capacete', 'Óculos'],        status: 'ok',  confidence: 97.3, datetime: '2024-10-15T14:32:00' },
  { id: 1242, camera: 'CAM-05', sector: 'Soldagem',    epis: ['Luva', 'Avental'],            status: 'err', confidence: 89.1, datetime: '2024-10-15T14:28:00' },
  { id: 1241, camera: 'CAM-02', sector: 'Pintura',     epis: ['Máscara', 'Óculos', 'Luva'], status: 'ok',  confidence: 95.6, datetime: '2024-10-15T14:25:00' },
  { id: 1240, camera: 'CAM-07', sector: 'Manutenção',  epis: ['Capacete'],                  status: 'err', confidence: 92.4, datetime: '2024-10-15T14:20:00' },
  { id: 1239, camera: 'CAM-03', sector: 'Almoxarifado',epis: ['Capacete', 'Bota'],          status: 'ok',  confidence: 98.1, datetime: '2024-10-15T14:18:00' },
];

// ─── Tooltip customizado dos gráficos ─────────────────────────────────────────

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-sm font-semibold text-slate-700">{label}</p>
      {payload.map((entrada, i) => (
        <p key={i} className="text-xs" style={{ color: entrada.color }}>
          {entrada.name}: {entrada.value}%
        </p>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Dashboard() {
  const [estatisticas,         setEstatisticas]         = useState(estatisticasMock);
  const [tendenciaConformidade, setTendenciaConformidade] = useState(tendenciaConformidadeMock);
  const [dadosSetor,           setDadosSetor]           = useState(ocorrenciasPorSetorMock);
  const [ocorrenciasRecentes,  setOcorrenciasRecentes]  = useState(ocorrenciasRecentesMock);

  // Polling a cada 30s para atualizar dados
  useEffect(() => {
    const intervalo = setInterval(() => {
      // TODO: buscar dados reais
      // async function atualizar() {
      //   const { data } = await dashboardApi.estatisticas();
      //   setEstatisticas(data);
      // }
      // atualizar();
    }, 30_000);
    return () => clearInterval(intervalo);
  }, []);

  const cartoes = [
    { titulo: 'Total de Ocorrências',   valor: estatisticas.totalOcorrencias.toLocaleString('pt-BR'), icone: AlertTriangle,  tendencia: estatisticas.tendencias.totalOcorrencias,    cor: 'laranja'  },
    { titulo: 'Taxa de Conformidade',   valor: `${estatisticas.taxaConformidade}%`,                   icone: CheckCircle,    tendencia: estatisticas.tendencias.taxaConformidade,     cor: 'verde'    },
    { titulo: 'Não Conformes Hoje',     valor: estatisticas.naoConformesHoje,                         icone: XCircle,        tendencia: estatisticas.tendencias.naoConformesHoje,     cor: 'vermelho' },
    { titulo: 'Solicitações Pendentes', valor: estatisticas.solicitacoesPendentes,                    icone: ClipboardList,  tendencia: estatisticas.tendencias.solicitacoesPendentes, cor: 'amarelo'  },
  ];

  return (
    <div className="space-y-6">
      {/* Cartões de estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cartoes.map((c) => (
          <CartaoEstatistica key={c.titulo} titulo={c.titulo} valor={c.valor} icone={c.icone} tendencia={c.tendencia} cor={c.cor} />
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Linha — tendência de conformidade */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Tendência de Conformidade — Últimos 7 dias
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tendenciaConformidade}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia"  tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<TooltipGrafico />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(v) => v === 'conformidade' ? 'Conformidade' : 'Não Conformidade'}
              />
              <Line type="monotone" dataKey="conformidade"    name="conformidade"    stroke="#22C55E" strokeWidth={2.5} dot={{ fill: '#22C55E', r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="naoConformidade" name="naoConformidade" stroke="#EF4444" strokeWidth={2}   dot={{ fill: '#EF4444', r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Barras — ocorrências por setor */}
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Ocorrências por Setor</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dadosSetor} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="setor"
                type="category"
                width={100}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="ok"          name="Conforme"      fill="#22C55E" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="naoConformes" name="Não Conforme" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimas ocorrências */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-700">Últimas Ocorrências</h3>
          <a href="/occurrences" className="text-xs font-medium text-brand hover:text-brand-h">
            Ver todas →
          </a>
        </div>
        <TabelaOcorrencias ocorrencias={ocorrenciasRecentes} compacto />
      </div>
    </div>
  );
}
