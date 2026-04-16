import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Shield, Building2, Phone, Calendar,
  Camera, Check, Save, ChevronLeft, LogOut,
} from 'lucide-react';

const estatisticasUsuario = [
  { rotulo: 'Ocorrências revisadas', valor: '247',  icone: Shield    },
  { rotulo: 'Solicitações aprovadas', valor: '38',   icone: Check     },
  { rotulo: 'Câmeras gerenciadas',   valor: '8',    icone: Camera    },
  { rotulo: 'Dias no sistema',       valor: '142',  icone: Calendar  },
];

export default function PerfilUsuario() {
  const { usuario, sair } = useAuth();
  const navegar = useNavigate();

  const nomeCompleto = usuario?.nome || usuario?.name || 'Usuário';
  const emailUsuario = usuario?.email || 'admin@episee.com';
  const cargoUsuario = usuario?.cargo || usuario?.role || 'Gestor';
  const inicialNome  = nomeCompleto.charAt(0).toUpperCase();

  const [nomeEdit,   setNomeEdit]   = useState(nomeCompleto);
  const [telefone,   setTelefone]   = useState(usuario?.telefone || '(42) 99999-0001');
  const [setor,      setSetor]      = useState(usuario?.setor || 'Produção Geral');
  const [editSalvo,  setEditSalvo]  = useState(false);

  function salvar() {
    setEditSalvo(true);
    setTimeout(() => setEditSalvo(false), 2000);
  }

  function sairENavegar() {
    sair();
    navegar('/login', { replace: true });
  }

  return (
    <div className="pg">

      <button onClick={() => navegar(-1)} className="btn btn-ghost btn-sm w-fit">
        <ChevronLeft size={16} /> Voltar
      </button>

      <div className="card p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white shadow-lg shadow-brand/20">
              {inicialNome}
            </div>
            <button className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow border border-slate-200 text-slate-500 hover:text-brand transition-colors">
              <Camera size={14} />
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-800">{nomeCompleto}</h2>
            <div className="row gap-2 mt-1 justify-center sm:justify-start">
              <span className="badge badge-info">
                <Shield size={11} />
                {cargoUsuario}
              </span>
              <span className="badge badge-gray">EPIsee v1.0</span>
            </div>
            <div className="mt-3 space-y-1">
              <p className="row gap-2 justify-center sm:justify-start text-sm text-slate-500">
                <Mail size={14} className="shrink-0 text-slate-400" />
                {emailUsuario}
              </p>
              <p className="row gap-2 justify-center sm:justify-start text-sm text-slate-500">
                <Building2 size={14} className="shrink-0 text-slate-400" />
                {setor}
              </p>
              <p className="row gap-2 justify-center sm:justify-start text-sm text-slate-500">
                <Phone size={14} className="shrink-0 text-slate-400" />
                {telefone}
              </p>
            </div>
          </div>

          <button onClick={sairENavegar} className="btn btn-sm btn-danger shrink-0">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {estatisticasUsuario.map(({ rotulo, valor, icone: Icone }) => (
          <div key={rotulo} className="card p-4 text-center">
            <div className="icon-box bg-orange-50 mx-auto mb-2">
              <Icone size={16} className="text-brand" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{valor}</p>
            <p className="sec-sub text-xs mt-0.5">{rotulo}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <div className="icon-box bg-blue-50"><User size={15} className="text-blue-500" /></div>
          <h3 className="sec-title">Editar Perfil</h3>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="field">
              <label className="label">Nome completo</label>
              <input className="input" value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">E-mail</label>
              <input className="input bg-slate-100 cursor-not-allowed" value={emailUsuario} readOnly />
            </div>
            <div className="field">
              <label className="label">Telefone</label>
              <input className="input" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="field">
              <label className="label">Setor</label>
              <input className="input" value={setor} onChange={(e) => setSetor(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={salvar} className="btn-primary">
              {editSalvo ? <Check size={16} /> : <Save size={16} />}
              {editSalvo ? 'Salvo!' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
