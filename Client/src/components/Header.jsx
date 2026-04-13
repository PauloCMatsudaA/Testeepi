import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bell, Search, Menu } from 'lucide-react';

const notificacoes = [
  { id: 1, texto: 'Não conformidade na Linha A',     tempo: 'há 5 min',  tipo: 'err'  },
  { id: 2, texto: 'Nova solicitação de EPI pendente', tempo: 'há 15 min', tipo: 'warn' },
  { id: 3, texto: 'Câmera CAM-03 ficou offline',      tempo: 'há 1h',     tipo: 'err'  },
];

export default function Cabecalho({ titulo, aoAbrirMenu }) {
  const { usuario }          = useAuth();
  const navegar              = useNavigate();
  const [notifAberta, setNotifAberta] = useState(false);

  const inicialUsuario = usuario?.nome?.charAt(0) || usuario?.name?.charAt(0) || 'U';
  const primeiroNome   = (usuario?.nome || usuario?.name || '').split(' ')[0];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      {/* Esquerda */}
      <div className="row gap-3">
        <button onClick={aoAbrirMenu} className="btn-icon" aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <h1 className="text-base font-semibold text-slate-800">{titulo}</h1>
      </div>

      {/* Direita */}
      <div className="row gap-2">
        {/* Busca — só desktop */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 sm:flex">
          <Search size={15} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-40 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
          />
        </div>

        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setNotifAberta((v) => !v)}
            className="btn-icon relative"
            aria-label="Notificações"
          >
            <Bell size={20} />
            {notificacoes.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-err text-[9px] font-bold text-white">
                {notificacoes.length}
              </span>
            )}
          </button>

          {notifAberta && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifAberta(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-72 card p-2 fade-in">
                <p className="px-3 py-2 text-sm font-semibold text-slate-700">Notificações</p>
                <ul className="space-y-0.5">
                  {notificacoes.map((n) => (
                    <li key={n.id} className="row gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full bg-${n.tipo}`} />
                      <div>
                        <p className="text-sm text-slate-700">{n.texto}</p>
                        <p className="sec-sub">{n.tempo}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 divider pt-1">
                  <button
                    onClick={() => setNotifAberta(false)}
                    className="w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-brand hover:bg-brand-l transition-colors"
                  >
                    Ver todas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar — clicável → perfil */}
        <button
          onClick={() => navegar('/perfil')}
          className="row gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 transition-colors"
          title="Ver meu perfil"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
            {inicialUsuario}
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">{primeiroNome}</span>
        </button>
      </div>
    </header>
  );
}
