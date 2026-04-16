import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Building2,
  Users,
  Camera,
  BarChart3,
} from "lucide-react";
import clsx from "clsx";

const setoresIniciais = [
  {
    id: 1,
    name: "Montagem A",
    description: "Linha de montagem principal",
    cameras: 2,
    workers: 45,
    compliance: 93.0,
  },
  {
    id: 2,
    name: "Soldagem",
    description: "Área de soldagem MIG/TIG e plasma",
    cameras: 2,
    workers: 28,
    compliance: 90.2,
  },
  {
    id: 3,
    name: "Pintura",
    description: "Cabine de pintura e preparação",
    cameras: 1,
    workers: 18,
    compliance: 95.5,
  },
  {
    id: 4,
    name: "Almoxarifado",
    description: "Estoque de matérias-primas e EPIs",
    cameras: 1,
    workers: 12,
    compliance: 96.2,
  },
  {
    id: 5,
    name: "Expedição",
    description: "Embalagem, carga e despacho",
    cameras: 1,
    workers: 15,
    compliance: 97.0,
  },
  {
    id: 6,
    name: "Manutenção",
    description: "Oficina de manutenção mecânica/elétrica",
    cameras: 1,
    workers: 10,
    compliance: 88.7,
  },
];

function barConformidade(valor) {
  const cor = valor >= 95 ? "bg-ok" : valor >= 90 ? "bg-warn" : "bg-err";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx("h-full rounded-full transition-all", cor)}
          style={{ width: `${valor}%` }}
        />
      </div>
      <span className="w-12 text-right text-xs font-medium text-slate-600">
        {valor}%
      </span>
    </div>
  );
}

export default function Setores() {
  const [setores, setSetores] = useState(setoresIniciais);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmarDel, setConfirmarDel] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", workers: "" });

  function abrirAdicionar() {
    setEditando(null);
    setForm({ name: "", description: "", workers: "" });
    setModalAberto(true);
  }

  function abrirEditar(setor) {
    setEditando(setor);
    setForm({
      name: setor.name,
      description: setor.description,
      workers: String(setor.workers),
    });
    setModalAberto(true);
  }

  function salvar() {
    if (!form.name) return;
    const dados = {
      name: form.name,
      description: form.description,
      workers: parseInt(form.workers) || 0,
    };
    if (editando) {
      setSetores((prev) =>
        prev.map((s) => (s.id === editando.id ? { ...s, ...dados } : s)),
      );
    } else {
      setSetores((prev) => [
        ...prev,
        { id: Date.now(), ...dados, cameras: 0, compliance: 0 },
      ]);
    }
    setModalAberto(false);
  }

  function excluir(id) {
    setSetores((prev) => prev.filter((s) => s.id !== id));
    setConfirmarDel(null);
  }

  const totalTrabalhadores = setores.reduce((s, x) => s + x.workers, 0);
  const totalCameras = setores.reduce((s, x) => s + x.cameras, 0);
  const mediaConformidade = (
    setores.reduce((s, x) => s + x.compliance, 0) / setores.length
  ).toFixed(1);

  return (
    <div className="pg-wide">
      {/* Resumo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          {
            Icon: Building2,
            cor: "bg-blue-50",
            icor: "text-blue-500",
            rotulo: "Total de Setores",
            valor: setores.length,
          },
          {
            Icon: Users,
            cor: "bg-green-50",
            icor: "text-ok",
            rotulo: "Total de Trabalhadores",
            valor: totalTrabalhadores,
          },
          {
            Icon: BarChart3,
            cor: "bg-orange-50",
            icor: "text-brand",
            rotulo: "Conformidade Média",
            valor: `${mediaConformidade}%`,
          },
        ].map(({ Icon, cor, icor, rotulo, valor }) => (
          <div key={rotulo} className="card row gap-3 p-4">
            <div className={clsx("icon-box-lg", cor)}>
              <Icon size={18} className={icor} />
            </div>
            <div>
              <p className="sec-sub">{rotulo}</p>
              <p className="text-xl font-bold text-slate-800">{valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cabeçalho */}
      <div className="row-between gap-3 flex-wrap">
        <p className="sec-sub">
          {setores.length} setores cadastrados · {totalCameras} câmeras ·{" "}
          {totalTrabalhadores} trabalhadores
        </p>
        <button onClick={abrirAdicionar} className="btn-primary">
          <Plus size={16} /> Adicionar Setor
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {setores.map((setor) => (
          <div key={setor.id} className="card card-hover p-5">
            <div className="row-between mb-3">
              <div className="row gap-3">
                <div className="icon-box-lg bg-blue-50">
                  <Building2 size={18} className="text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{setor.name}</h4>
                  <p className="sec-sub text-xs max-w-[160px] truncate">
                    {setor.description}
                  </p>
                </div>
              </div>
              <span
                className={clsx(
                  "badge",
                  setor.compliance >= 95
                    ? "badge-ok"
                    : setor.compliance >= 90
                      ? "badge-warn"
                      : "badge-err",
                )}
              >
                {setor.compliance}%
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="row gap-1.5 mb-0.5">
                  <Camera size={12} className="text-slate-400" />
                  <span className="sec-sub text-[11px]">Câmeras</span>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {setor.cameras}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <div className="row gap-1.5 mb-0.5">
                  <Users size={12} className="text-slate-400" />
                  <span className="sec-sub text-[11px]">Trabalhadores</span>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {setor.workers}
                </p>
              </div>
            </div>

            {/* Barra conformidade */}
            <div className="mb-4">
              <p className="sec-sub text-[11px] mb-1">Conformidade</p>
              {barConformidade(setor.compliance)}
            </div>

            {/* Ações */}
            <div className="row gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => abrirEditar(setor)}
                className="btn btn-full btn-sm btn-ghost"
              >
                <Edit2 size={13} /> Editar
              </button>
              <button
                onClick={() => setConfirmarDel(setor.id)}
                className="btn btn-full btn-sm btn-danger"
              >
                <Trash2 size={13} /> Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal adicionar/editar */}
      {modalAberto && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-head">
              <h3 className="modal-title">
                {editando ? "Editar Setor" : "Adicionar Setor"}
              </h3>
              <button
                onClick={() => setModalAberto(false)}
                className="btn-icon"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="field">
                <label className="label">Nome do Setor</label>
                <input
                  className="input"
                  placeholder="Ex: Usinagem"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Descrição</label>
                <input
                  className="input"
                  placeholder="Descreva brevemente o setor"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label className="label">Número de Trabalhadores</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="Ex: 25"
                  value={form.workers}
                  onChange={(e) =>
                    setForm({ ...form, workers: e.target.value })
                  }
                />
                <p className="sec-sub text-xs mt-1">
                  Quantidade de trabalhadores alocados neste setor.
                </p>
              </div>
            </div>
            <div className="modal-foot">
              <button
                onClick={() => setModalAberto(false)}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!form.name}
                className="btn-primary disabled:opacity-50"
              >
                {editando ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmarDel && (
        <div className="overlay">
          <div className="modal-sm fade-in">
            <div className="row gap-3 mb-4">
              <div className="icon-box-lg bg-red-100">
                <Trash2 size={20} className="text-err" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Remover Setor</h3>
                <p className="sec-sub">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmarDel(null)}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button
                onClick={() => excluir(confirmarDel)}
                className="btn bg-err text-white hover:bg-red-600"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
