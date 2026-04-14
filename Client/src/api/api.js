import axios from "axios";

const cliente = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

cliente.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("episee_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (erro) => Promise.reject(erro),
);

cliente.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401) {
      localStorage.removeItem("episee_token");
      localStorage.removeItem("episee_user");
      window.location.href = "/login";
    }
    return Promise.reject(erro);
  },
);

export const autenticacaoApi = {
  login: (email, senha) =>
    cliente.post(
      "/api/auth/login",
      new URLSearchParams({ username: email, password: senha }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    ),
};

// ── Usuários ──────────────────────────────────────────────────────────────────
export const usuariosApi = {
  listar: (filtros) => cliente.get("/api/users", { params: filtros }),
  buscarPor: (id) => cliente.get(`/api/users/${id}`),
  criar: (dados) => cliente.post("/api/users", dados),
  editar: (id, dados) => cliente.patch(`/api/users/${id}`, dados),
  excluir: (id) => cliente.delete(`/api/users/${id}`),
  alterarSenha: (id, dados) => cliente.patch(`/api/users/${id}/password`, dados),
};

// ── Ocorrências ───────────────────────────────────────────────────────────────
export const ocorrenciasApi = {
  listar: (filtros) => cliente.get("/api/occurrences", { params: filtros }),
  buscarPor: (id) => cliente.get(`/api/occurrences/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  estatisticas: () => cliente.get("/api/dashboard/stats"),
  tendenciaConformidade: (dias = 7) =>
    cliente.get("/api/dashboard/compliance-trend", { params: { dias } }),
  ocorrenciasPorSetor: () =>
    cliente.get("/api/dashboard/occurrences-by-sector"),
  recentes: (limite = 5) =>
    cliente.get("/api/dashboard/recent", { params: { limit: limite } }),
};

// ── Relatórios ────────────────────────────────────────────────────────────────
export const relatoriosApi = {
  resumo: (filtros) => cliente.get("/api/reports/summary", { params: filtros }),
  conformidadePorPeriodo: (filtros) =>
    cliente.get("/api/reports/compliance-by-period", { params: filtros }),
  episAusentes: (filtros) =>
    cliente.get("/api/reports/missing-epis", { params: filtros }),
  riscoSetor: (filtros) =>
    cliente.get("/api/reports/sector-risk", { params: filtros }),
  exportarCsv: (filtros) =>
    cliente.get("/api/reports/export-csv", {
      params: filtros,
      responseType: "blob",
    }),
};

// ── Solicitações EPI ──────────────────────────────────────────────────────────
export const solicitacoesApi = {
  listar: (filtros) => cliente.get("/api/epi-requests", { params: filtros }),
  aprovar: (id) => cliente.patch(`/api/epi-requests/${id}/approve`),
  rejeitar: (id) => cliente.patch(`/api/epi-requests/${id}/reject`),
};

// ── Câmeras ───────────────────────────────────────────────────────────────────
export const camerasApi = {
  listar: () => cliente.get("/api/cameras"),
  criar: (dados) => cliente.post("/api/cameras", dados),
  editar: (id, dados) => cliente.patch(`/api/cameras/${id}`, dados),
  excluir: (id) => cliente.delete(`/api/cameras/${id}`),
  iniciarDeteccao: (id) => cliente.post(`/api/cameras/${id}/start-detection`),
  pararDeteccao: (id) => cliente.post(`/api/cameras/${id}/stop-detection`),
};

// ── Setores ───────────────────────────────────────────────────────────────────
export const setoresApi = {
  listar: () => cliente.get("/api/sectors"),
  criar: (dados) => cliente.post("/api/sectors", dados),
  editar: (id, dados) => cliente.put(`/api/sectors/${id}`, dados),
  excluir: (id) => cliente.delete(`/api/sectors/${id}`),
};

// ── Configurações ─────────────────────────────────────────────────────────────
export const configuracoesApi = {
  buscarPerfil: () => cliente.get("/api/settings/profile"),
  atualizarPerfil: (dados) => cliente.put("/api/settings/profile", dados),
  alterarSenha: (dados) => cliente.put("/api/settings/password", dados),
  buscarNotificacoes: () => cliente.get("/api/settings/notifications"),
  salvarNotificacoes: (dados) =>
    cliente.put("/api/settings/notifications", dados),
};
export const reportsApi = {
  gerarAnalise: (dados) => cliente.post('/api/reports/generate-analysis', dados),
};
export const epiRequestsApi = {
  listar:   (filtros) => cliente.get('/api/epi-requests', { params: filtros }),
  aprovar:  (id)      => cliente.patch(`/api/epi-requests/${id}/approve`),
  rejeitar: (id)      => cliente.patch(`/api/epi-requests/${id}/reject`),
  criar:    (dados)   => cliente.post('/api/epi-requests', dados),
};

export default cliente;