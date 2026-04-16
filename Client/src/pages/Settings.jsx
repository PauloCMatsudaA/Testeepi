import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Bell, Cpu, Save, Eye, EyeOff, Check, Copy, Terminal } from 'lucide-react';
import clsx from 'clsx';

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
        checked ? 'bg-brand' : 'bg-slate-200'
      )}
    >
      <span
        className={clsx(
          'mt-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

const passosBest = [
  {
    passo: 1, titulo: 'Instalar dependências',
    descricao: 'Instale a biblioteca Ultralytics e dependências do EPIsee:',
    codigo: 'pip install ultralytics opencv-python requests',
  },
  {
    passo: 2, titulo: 'Baixar o modelo treinado',
    descricao: 'Faça download do modelo YOLOv8 treinado para EPIs:',
    codigo: 'wget https://api.episee.com.br/models/episee-yolov8n-epis.pt',
  },
  {
    passo: 3, titulo: 'Script de detecção',
    descricao: 'Crie o script Python para detecção em tempo real:',
    codigo: `from ultralytics import YOLO
import cv2, requests

model   = YOLO('episee-yolov8n-epis.pt')
API_URL = 'http://localhost:8000/api/detection'
cap     = cv2.VideoCapture('rtsp://192.168.1.101:554/stream')

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break
    results = model(frame, conf=0.5)
    for r in results:
        detections = [{'class': model.names[int(b.cls)],
                       'confidence': float(b.conf),
                       'bbox': b.xyxy[0].tolist()} for b in r.boxes]
        if detections:
            requests.post(API_URL, json={'camera_id': 1, 'detections': detections})`,
  },
  {
    passo: 4, titulo: 'Executar a detecção',
    descricao: 'Inicie o script para cada câmera cadastrada:',
    codigo: 'python detect_epis.py --camera-id 1 --rtsp-url rtsp://192.168.1.101:554/stream',
  },
];

export default function Configuracoes() {
  const { usuario } = useAuth();

  const [nome,          setNome]          = useState(usuario?.nome || usuario?.name || '');
  const [email,         setEmail]         = useState(usuario?.email || '');
  const [senhaAtual,    setSenhaAtual]    = useState('');
  const [novaSenha,     setNovaSenha]     = useState('');
  const [confirmarSenha,setConfirmarSenha]= useState('');
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [perfilSalvo,   setPerfilSalvo]   = useState(false);
  const [senhaSalva,    setSenhaSalva]    = useState(false);

  const [notifNaoConformidade, setNotifNaoConformidade] = useState(true);
  const [notifSolicitacao,     setNotifSolicitacao]     = useState(true);
  const [notifCameraOffline,   setNotifCameraOffline]   = useState(false);
  const [notifRelatorio,       setNotifRelatorio]       = useState(true);
  const [notifSalvo,           setNotifSalvo]           = useState(false);

  const [passoCopiado, setPassoCopiado] = useState(null);

  function salvarPerfil() {

    setPerfilSalvo(true);
    setTimeout(() => setPerfilSalvo(false), 2000);
  }

  function alterarSenha() {
    if (novaSenha !== confirmarSenha || !senhaAtual) return;
    setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
    setSenhaSalva(true);
    setTimeout(() => setSenhaSalva(false), 2000);
  }

  function salvarNotificacoes() {
    setNotifSalvo(true);
    setTimeout(() => setNotifSalvo(false), 2000);
  }

  function copiar(texto, idx) {
    navigator.clipboard.writeText(texto);
    setPassoCopiado(idx);
    setTimeout(() => setPassoCopiado(null), 2000);
  }

  const tiposInput = mostrarSenhas ? 'text' : 'password';
  const senhasNaoCoincidem = novaSenha && confirmarSenha && novaSenha !== confirmarSenha;

  const itensNotif = [
    { rotulo: 'Alertas de não conformidade', desc: 'Notificação quando não conformidade for detectada', valor: notifNaoConformidade, onChange: setNotifNaoConformidade },
    { rotulo: 'Novas solicitações de EPI',   desc: 'Notificação de novas solicitações pendentes',       valor: notifSolicitacao,     onChange: setNotifSolicitacao     },
    { rotulo: 'Câmera offline',              desc: 'Alerta quando uma câmera ficar inativa',            valor: notifCameraOffline,   onChange: setNotifCameraOffline   },
    { rotulo: 'Relatório diário',            desc: 'Resumo diário de conformidade por e-mail',          valor: notifRelatorio,       onChange: setNotifRelatorio       },
  ];

  return (
    <div className="pg">
      <div className="card">
        <div className="card-header">
          <div className="icon-box bg-blue-50"><User size={16} className="text-blue-500" /></div>
          <h3 className="sec-title">Minha Conta</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="field">
              <label className="label">Nome</label>
              <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={salvarPerfil} className="btn-primary">
              {perfilSalvo ? <Check size={16} /> : <Save size={16} />}
              {perfilSalvo ? 'Salvo!' : 'Salvar'}
            </button>
          </div>

          <div className="divider pt-4 space-y-3">
            <h4 className="sec-title mb-3">Alterar Senha</h4>
            <div className="input-icon">
              <input
                className="input pr-10"
                type={tiposInput}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Senha atual"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhas((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {mostrarSenhas ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="input" type={tiposInput} value={novaSenha}      onChange={(e) => setNovaSenha(e.target.value)}      placeholder="Nova senha"     />
              <input className="input" type={tiposInput} value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Confirmar senha"/>
            </div>
            {senhasNaoCoincidem && <p className="text-xs text-err">As senhas não coincidem.</p>}
            <div className="flex justify-end">
              <button
                onClick={alterarSenha}
                disabled={!senhaAtual || !novaSenha || novaSenha !== confirmarSenha}
                className="btn bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {senhaSalva ? <Check size={16} /> : <Save size={16} />}
                {senhaSalva ? 'Senha alterada!' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="icon-box bg-orange-50"><Bell size={16} className="text-brand" /></div>
          <h3 className="sec-title">Notificações</h3>
        </div>
        <div className="card-body space-y-3">
          {itensNotif.map((item, i) => (
            <div key={i} className="row-between rounded-lg border border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{item.rotulo}</p>
                <p className="sec-sub">{item.desc}</p>
              </div>
              <Toggle checked={item.valor} onChange={item.onChange} />
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button onClick={salvarNotificacoes} className="btn-primary">
              {notifSalvo ? <Check size={16} /> : <Save size={16} />}
              {notifSalvo ? 'Salvo!' : 'Salvar Preferências'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="icon-box bg-purple-50"><Cpu size={16} className="text-purple-500" /></div>
          <h3 className="sec-title">Integração YOLOv8</h3>
        </div>
        <div className="card-body space-y-4">
          <p className="sec-sub text-sm">
            Configure o modelo YOLOv8 para detecção de EPIs em tempo real. Siga os passos abaixo para conectar suas câmeras.
          </p>
          {passosBest.map((item) => (
            <div key={item.passo} className="rounded-lg border border-slate-100 p-4">
              <div className="row gap-3 mb-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {item.passo}
                </span>
                <h4 className="text-sm font-semibold text-slate-700">{item.titulo}</h4>
              </div>
              <p className="sec-sub pl-10 mb-3">{item.descricao}</p>
              <div className="code-block ml-10">
                <pre><code>{item.codigo}</code></pre>
                <button
                  onClick={() => copiar(item.codigo, item.passo)}
                  className="absolute right-2 top-2 rounded-md bg-white/10 p-1.5 text-slate-400 hover:bg-white/20 hover:text-white transition-colors"
                >
                  {passoCopiado === item.passo ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          ))}
          <div className="alert-info text-xs">
            <Terminal size={15} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Classes suportadas:</p>
              <p className="mt-1">capacete · oculos · luva · bota · mascara · protetor_auricular · avental · cinto_seguranca</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
