import { useState, useEffect } from 'react';
import { Camera, Plus, Edit2, Trash2, Wifi, WifiOff, X, AlertTriangle, Clock, Play, Monitor, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { camerasApi, setoresApi } from '../api/api';

// ── Modal de visualização de stream ──────────────────────────────────────────

function ModalVisualizarCamera({ cam, aoFechar }) {
  const ativa = cam.is_active;
  const nomeSetor = cam.sector?.name || '—';
  const urlRtsp   = cam.rtsp_url || '—';
  const ultimoAcesso = cam.last_seen
    ? new Date(cam.last_seen).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Nunca';

  return (
    <div className="overlay">
      <div className="modal-lg fade-in">
        <div className="modal-head">
          <div className="row gap-3">
            <div className={clsx('icon-box-lg', ativa ? 'bg-green-50' : 'bg-slate-100')}>
              <Monitor size={20} className={ativa ? 'text-ok' : 'text-slate-400'} />
            </div>
            <div>
              <h3 className="modal-title">{cam.name}</h3>
              <p className="sec-sub">{nomeSetor}</p>
            </div>
          </div>
          <button onClick={aoFechar} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Área de vídeo */}
        <div className="mb-4 overflow-hidden rounded-xl bg-dark aspect-video flex items-center justify-center">
          {ativa ? (
            <div className="col items-center gap-3 text-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-brand/10 flex items-center justify-center">
                  <Play size={40} className="text-brand ml-1" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ok">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
                </span>
              </div>
              <p className="text-sm font-medium text-white">Stream ao vivo disponível</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Para exibir o vídeo em tempo real, conecte via HLS ou WebRTC.<br />
                {/* Quando tiver player HLS: <video src={cam.hlsUrl} autoPlay muted className="w-full" /> */}
              </p>
            </div>
          ) : (
            <div className="col items-center gap-3">
              <WifiOff size={40} className="text-slate-500" />
              <p className="text-sm text-slate-400">Câmera offline — sem sinal</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
          <div>
            <p className="sec-sub">URL RTSP</p>
            <p className="mt-1 font-mono text-xs text-slate-700 break-all">{urlRtsp}</p>
          </div>
          <div>
            <p className="sec-sub">Último acesso</p>
            <p className="mt-1 text-sm text-slate-700">{ultimoAcesso}</p>
          </div>
          <div>
            <p className="sec-sub">Status</p>
            <p className={clsx('mt-1 text-sm font-medium', ativa ? 'text-ok' : 'text-slate-400')}>
              {ativa ? '● Ativa' : '○ Inativa'}
            </p>
          </div>
          <div>
            <p className="sec-sub">Setor</p>
            <p className="mt-1 text-sm text-slate-700">{nomeSetor}</p>
          </div>
        </div>

        <div className="modal-foot">
          <button onClick={aoFechar} className="btn-ghost">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

const formVazio = { name: '', sector_id: '', rtsp_url: '', is_active: true };

export default function Cameras() {
  const [cameras,      setCameras]      = useState([]);
  const [setores,      setSetores]      = useState([]);
  const [carregando,   setCarregando]   = useState(true);
  const [salvando,     setSalvando]     = useState(false);
  const [erro,         setErro]         = useState(null);
  const [modalForm,    setModalForm]    = useState(false);
  const [modalStream,  setModalStream]  = useState(null);
  const [editando,     setEditando]     = useState(null);
  const [confirmarDel, setConfirmarDel] = useState(null);
  const [form,         setForm]         = useState(formVazio);

  // Carrega câmeras e setores ao montar
  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const [resCameras, resSetores] = await Promise.all([
          camerasApi.listar(),
          setoresApi.listar(),
        ]);
        setCameras(resCameras.data);
        setSetores(resSetores.data);
      } catch (e) {
        setErro('Não foi possível carregar as câmeras. Verifique se o backend está rodando.');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  function abrirAdicionar() {
    setEditando(null);
    setForm({ ...formVazio, sector_id: setores[0]?.id || '' });
    setModalForm(true);
  }

  function abrirEditar(cam) {
    setEditando(cam);
    setForm({
      name:      cam.name,
      sector_id: cam.sector_id,
      rtsp_url:  cam.rtsp_url || '',
      is_active: cam.is_active,
    });
    setModalForm(true);
  }

  async function salvar() {
    if (!form.name || !form.rtsp_url || !form.sector_id) return;
    try {
      setSalvando(true);
      const payload = {
        name:      form.name,
        sector_id: Number(form.sector_id),
        rtsp_url:  form.rtsp_url,
        is_active: form.is_active,
      };
      if (editando) {
        const res = await camerasApi.editar(editando.id, payload);
        setCameras((prev) => prev.map((c) => c.id === editando.id ? res.data : c));
      } else {
        const res = await camerasApi.criar(payload);
        setCameras((prev) => [...prev, res.data]);
      }
      setModalForm(false);
    } catch (e) {
      alert('Erro ao salvar câmera: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id) {
    try {
      await camerasApi.excluir(id);
      setCameras((prev) => prev.filter((c) => c.id !== id));
      setConfirmarDel(null);
    } catch (e) {
      alert('Erro ao remover câmera: ' + (e.response?.data?.detail || e.message));
    }
  }

  // Enriquece câmera com objeto setor para o modal
  function comSetor(cam) {
    return { ...cam, sector: setores.find((s) => s.id === cam.sector_id) };
  }

  const ativas = cameras.filter((c) => c.is_active).length;

  if (carregando) {
    return (
      <div className="pg-wide col items-center justify-center gap-3 py-20">
        <Loader2 size={32} className="animate-spin text-brand" />
        <p className="sec-sub">Carregando câmeras...</p>
      </div>
    );
  }

  return (
    <div className="pg-wide">
      {/* Erro de conexão */}
      {erro && (
        <div className="alert-err mb-4">
          <AlertTriangle size={16} className="shrink-0" />
          <p>{erro}</p>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="row-between gap-3 flex-wrap">
        <p className="sec-sub">{ativas} de {cameras.length} câmeras ativas</p>
        <button onClick={abrirAdicionar} className="btn-primary">
          <Plus size={16} /> Adicionar Câmera
        </button>
      </div>

      {/* Grid */}
      {cameras.length === 0 ? (
        <div className="col items-center gap-3 py-20 text-center">
          <Camera size={40} className="text-slate-300" />
          <p className="sec-sub">Nenhuma câmera cadastrada ainda.</p>
          <button onClick={abrirAdicionar} className="btn-primary">
            <Plus size={16} /> Adicionar primeira câmera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cameras.map((cam) => {
            const ativa     = cam.is_active;
            const nomeSetor = setores.find((s) => s.id === cam.sector_id)?.name || '—';
            const ultimoAcesso = cam.last_seen
              ? new Date(cam.last_seen).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              : 'Nunca';

            return (
              <div key={cam.id} className="card card-hover p-5">
                {/* Topo */}
                <div className="row-between mb-3">
                  <div className="row gap-3">
                    <div className={clsx('icon-box-lg', ativa ? 'bg-green-50' : 'bg-slate-100')}>
                      <Camera size={20} className={ativa ? 'text-ok' : 'text-slate-400'} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{cam.name}</h4>
                      <p className="sec-sub">{nomeSetor}</p>
                    </div>
                  </div>
                  <span className={clsx('badge', ativa ? 'badge-ok' : 'badge-gray')}>
                    <span className={ativa ? 'dot-ok' : 'dot-gray'} />
                    {ativa ? 'Ativa' : 'Inativa'}
                  </span>
                </div>

                {/* Aviso YOLOv8 */}
                <div className="alert-warn text-xs mb-3">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  <p>Para detecção em tempo real, configure o YOLOv8 em Configurações.</p>
                </div>

                {/* Info */}
                <div className="space-y-2 text-sm">
                  <div className="row-between">
                    <span className="sec-sub row gap-1"><Wifi size={13} /> URL RTSP</span>
                    <span className="truncate ml-2 max-w-[160px] font-mono text-xs text-slate-600">
                      {cam.rtsp_url || '—'}
                    </span>
                  </div>
                  <div className="row-between">
                    <span className="sec-sub row gap-1"><Clock size={13} /> Último acesso</span>
                    <span className="text-xs text-slate-600">{ultimoAcesso}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="row gap-2 border-t border-slate-100 mt-4 pt-3">
                  <button
                    onClick={() => setModalStream(comSetor(cam))}
                    className="btn btn-full btn-sm bg-brand/5 text-brand hover:bg-brand/10"
                  >
                    <Play size={13} /> Ver câmera
                  </button>
                  <button onClick={() => abrirEditar(cam)} className="btn btn-full btn-sm btn-ghost">
                    <Edit2 size={13} /> Editar
                  </button>
                  <button onClick={() => setConfirmarDel(cam.id)} className="btn btn-full btn-sm btn-danger">
                    <Trash2 size={13} /> Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal visualizar câmera */}
      {modalStream && <ModalVisualizarCamera cam={modalStream} aoFechar={() => setModalStream(null)} />}

      {/* Modal adicionar/editar */}
      {modalForm && (
        <div className="overlay">
          <div className="modal fade-in">
            <div className="modal-head">
              <h3 className="modal-title">{editando ? 'Editar Câmera' : 'Adicionar Câmera'}</h3>
              <button onClick={() => setModalForm(false)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="field">
                <label className="label">Nome da Câmera</label>
                <input
                  className="input"
                  placeholder="Ex: CAM-09"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label">Setor</label>
                <select
                  className="select"
                  value={form.sector_id}
                  onChange={(e) => setForm({ ...form, sector_id: e.target.value })}
                >
                  <option value="">Selecione um setor</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">URL RTSP</label>
                <input
                  className="input font-mono text-sm"
                  placeholder="rtsp://usuario:senha@192.168.x.x:554/stream"
                  value={form.rtsp_url}
                  onChange={(e) => setForm({ ...form, rtsp_url: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Exemplo: rtsp://PauloCesar:Episee1604@192.168.39.8:554/stream1
                </p>
              </div>
              <div className="field">
                <label className="label">Status</label>
                <select
                  className="select"
                  value={form.is_active ? 'ativo' : 'inativo'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === 'ativo' })}
                >
                  <option value="ativo">Ativa</option>
                  <option value="inativo">Inativa</option>
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button onClick={() => setModalForm(false)} className="btn-ghost">Cancelar</button>
              <button
                onClick={salvar}
                disabled={!form.name || !form.rtsp_url || !form.sector_id || salvando}
                className="btn-primary disabled:opacity-50"
              >
                {salvando
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                  : editando ? 'Salvar Alterações' : 'Adicionar'
                }
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
              <div className="icon-box-lg bg-red-100"><Trash2 size={20} className="text-err" /></div>
              <div>
                <h3 className="font-semibold text-slate-800">Remover Câmera</h3>
                <p className="sec-sub">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmarDel(null)} className="btn-ghost">Cancelar</button>
              <button onClick={() => excluir(confirmarDel)} className="btn bg-err text-white hover:bg-red-600">
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
