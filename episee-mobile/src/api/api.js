// src/api/api.js — Camada de comunicação com o backend EPIsee
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL base da API — ajuste para o endereço do seu servidor
const BASE_URL = 'http://localhost:8000';

// Criação da instância Axios com configurações padrão
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Interceptor de requisição ────────────────────────────────────────────────
// Injeta automaticamente o token JWT em todas as requisições
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@episee:token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('[API] Erro ao obter token do storage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ── Interceptor de resposta ──────────────────────────────────────────────────
// Trata erros globais (ex: 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido — limpa o storage
      await AsyncStorage.multiRemove(['@episee:token', '@episee:user']);
    }
    return Promise.reject(error);
  }
);

// ── Endpoints de Autenticação ────────────────────────────────────────────────

/**
 * Faz login do trabalhador
 * @param {string} email
 * @param {string} senha
 * @returns {Promise<{token: string, user: object}>}
 */
export const loginApi = async (email, senha) => {
  // Dados mockados para demonstração — substitua pela chamada real
  if (email === 'demo@episee.com' && senha === '123456') {
    return {
      token: 'mock-jwt-token-episee-2024',
      user: {
        id: 1,
        nome: 'João Silva',
        email: 'demo@episee.com',
        setor: 'Produção',
        cargo: 'Operador de Máquinas',
        telefone: '(11) 99999-8888',
        membro_desde: '2023-03-15',
      },
    };
  }
  // Chamada real (descomente quando o backend estiver disponível):
  // const response = await api.post('/auth/login', { email, senha });
  // return response.data;
  throw new Error('Credenciais inválidas');
};

// ── Endpoints de Solicitações de EPI ────────────────────────────────────────

/**
 * Cria uma nova solicitação de EPI
 * @param {object} dados - { tipo_epi, motivo, observacoes, setor }
 * @returns {Promise<object>}
 */
export const criarSolicitacao = async (dados) => {
  // Mock de resposta de sucesso
  return {
    id: Math.floor(Math.random() * 1000),
    ...dados,
    status: 'Pendente',
    data_solicitacao: new Date().toISOString(),
  };
  // Chamada real:
  // const response = await api.post('/solicitacoes/', dados);
  // return response.data;
};

/**
 * Busca solicitações do trabalhador logado
 * @returns {Promise<Array>}
 */
export const minhasSolicitacoes = async () => {
  // Dados mockados para demonstração
  return [
    {
      id: 1,
      tipo_epi: 'Capacete de Segurança',
      motivo: 'Equipamento danificado',
      observacoes: 'Capacete com trinca na aba frontal',
      setor: 'Produção',
      status: 'Aprovada',
      data_solicitacao: '2024-11-10T09:30:00Z',
    },
    {
      id: 2,
      tipo_epi: 'Luva de Proteção',
      motivo: 'Troca periódica',
      observacoes: '',
      setor: 'Produção',
      status: 'Pendente',
      data_solicitacao: '2024-11-18T14:20:00Z',
    },
    {
      id: 3,
      tipo_epi: 'Óculos de Proteção',
      motivo: 'Equipamento perdido',
      observacoes: 'Óculos caiu na máquina e se perdeu',
      setor: 'Produção',
      status: 'Rejeitada',
      data_solicitacao: '2024-10-28T08:00:00Z',
    },
  ];
  // Chamada real:
  // const response = await api.get('/solicitacoes/minhas/');
  // return response.data;
};

export default api;

// ── Endpoint do Chatbot ──────────────────────────────────────────────────────

const CHATBOT_URL = 'http://localhost:8001';

const chatbotCliente = axios.create({
  baseURL: CHATBOT_URL,
  timeout: 30000, // GPT-4o pode demorar
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Envia uma mensagem ao chatbot EPIsee
 * @param {string} mensagem  — texto do usuário
 * @param {string} telefone  — identificador único do usuário (histórico)
 * @returns {Promise<{resposta: string}>}
 */
export const chatbotApi = async (mensagem, telefone = 'app-user') => {
  const response = await chatbotCliente.post('/chat', {
    message: mensagem,
    phone: telefone,
  });
  return response.data; // { resposta: string } ou { reply: string }
};
