import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ShieldCheck, LayoutDashboard, AlertTriangle, FileBarChart,
  ClipboardList, Camera, Building2, Settings, LogOut, X,
} from 'lucide-react';

const itensMenu = [
  { rota: '/dashboard',    rotulo: 'Dashboard',        Icone: LayoutDashboard },
  { rota: '/occurrences',  rotulo: 'Ocorrências',       Icone: AlertTriangle   },
  { rota: '/reports',      rotulo: 'Relatórios',        Icone: FileBarChart    },
  { rota: '/epi-requests', rotulo: 'Solicitações EPI',  Icone: ClipboardList   },
  { rota: '/cameras',      rotulo: 'Câmeras',           Icone: Camera          },
  { rota: '/sectors',      rotulo: 'Setores',           Icone: Building2       },
  { rota: '/settings',     rotulo: 'Configurações',     Icone: Settings        },
];

const classeOverlay = (aberto) => [
  'fixed inset-0 z-40 bg-black/50 transition-opacity duration-300',
  aberto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
].join(' ');

const classeGaveta = (aberto) => [
  'fixed top-0 left-0 z-50 flex h-screen w-64 flex-col bg-dark text-white',
  'shadow-2xl transition-transform duration-300',
  aberto ? 'translate-x-0' : '-translate-x-full',
].join(' ');

const classeLink = (ativo) => [
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
  ativo
    ? 'bg-brand text-white shadow-lg shadow-brand/20'
    : 'text-slate-400 hover:bg-white/5 hover:text-white',
].join(' ');

export default function MenuGaveta({ aberto, aoFechar }) {
  const { usuario, sair } = useAuth();

  function sairEFechar() {
    sair();
    aoFechar();
  }

  const inicialUsuario = usuario?.nome?.charAt(0) || usuario?.name?.charAt(0) || 'U';
  const nomeUsuario    = usuario?.nome || usuario?.name || '';
  const cargoUsuario   = usuario?.cargo || usuario?.role || '';

  return (
    <>
      <div aria-hidden="true" onClick={aoFechar} className={classeOverlay(aberto)} />

      <nav aria-label="Menu de navegação" className={classeGaveta(aberto)}>
        {/* Cabeçalho */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">
              EPI<span className="text-brand">see</span>
            </span>
          </div>
          <button
            onClick={aoFechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Links */}
        <ul className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {itensMenu.map(({ rota, rotulo, Icone }) => (
            <li key={rota}>
              <NavLink
                to={rota}
                onClick={aoFechar}
                className={({ isActive }) => classeLink(isActive)}
              >
                <Icone size={18} className="shrink-0" />
                {rotulo}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Rodapé */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {usuario && (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                {inicialUsuario}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{nomeUsuario}</p>
                <p className="truncate text-xs text-slate-400 capitalize">{cargoUsuario}</p>
              </div>
            </div>
          )}
          <button
            onClick={sairEFechar}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </nav>
    </>
  );
}
