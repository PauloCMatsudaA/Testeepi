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
  const { usuario }   = useAuth();
  const navegar       = useNavigate();
  const [notifAberta, setNotifAberta] = useState(false);

  const inicial     = usuario?.nome?.charAt(0) || usuario?.name?.charAt(0) || 'U';
  const primeiroNome = (usuario?.nome || usuario?.name || '').split(' ')[0];

  return (
    <header className="header">
      <div className="header-left">
        <button onClick={aoAbrirMenu} className="btn-icon" aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <h1 className="header-title">{titulo}</h1>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={15} style={{ color: 'var(--text-faint)' }} />
          <input type="text" placeholder="Buscar..." />
        </div>

        <div className="notif-wrapper">
          <button
            onClick={() => setNotifAberta(v => !v)}
            className="btn-icon"
            aria-label="Notificações"
          >
            <Bell size={20} />
            {notificacoes.length > 0 && (
              <span className="notif-badge">{notificacoes.length}</span>
            )}
          </button>

          {notifAberta && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifAberta(false)} />
              <div className="notif-dropdown card fade-in" style={{ padding: '0.5rem' }}>
                <p className="notif-heading">Notificações</p>
                <ul>
                  {notificacoes.map(n => (
                    <li key={n.id} className="notif-item">
                      <span
                        className="notif-item-dot"
                        style={{ background: `var(--${n.tipo})` }}
                      />
                      <div>
                        <p className="notif-item-text">{n.texto}</p>
                        <p className="notif-item-time">{n.tempo}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="notif-footer">
                  <button
                    className="notif-footer-btn"
                    onClick={() => setNotifAberta(false)}
                  >
                    Ver todas
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          className="header-avatar-btn"
          onClick={() => navegar('/perfil')}
          title="Ver meu perfil"
        >
          <div className="header-avatar">{inicial}</div>
          <span className="header-avatar-name">{primeiroNome}</span>
        </button>
      </div>
    </header>
  );
}