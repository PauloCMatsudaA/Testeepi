// src/screens/MyRequestsScreen.js — Tela de listagem de solicitações do trabalhador
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { minhasSolicitacoes } from '../api/api';
import RequestCard from '../components/RequestCard';

// ── Dados mockados de fallback ────────────────────────────────────────────────
const MOCK_SOLICITACOES = [
  {
    id: 1,
    tipo_epi: 'Capacete de Segurança',
    motivo: 'Equipamento danificado',
    observacoes: 'Capacete com trinca na aba frontal após queda',
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
    observacoes: 'Óculos caiu dentro da máquina CNC',
    setor: 'Produção',
    status: 'Rejeitada',
    data_solicitacao: '2024-10-28T08:00:00Z',
  },
];

// ── Componente de estado vazio ─────────────────────────────────────────────────
function EstadoVazio() {
  return (
    <View style={estilos.vazio}>
      {/* Ilustração simples */}
      <View style={estilos.vazioIconeContainer}>
        <Ionicons name="clipboard-outline" size={64} color="#CBD5E1" />
      </View>
      <Text style={estilos.vazioTitulo}>Nenhuma solicitação ainda</Text>
      <Text style={estilos.vazioSubtitulo}>
        Suas solicitações de EPI aparecerão aqui.{'\n'}
        Use o botão central para solicitar um EPI.
      </Text>
    </View>
  );
}

// ── Componente de contador de status ─────────────────────────────────────────
function ContadoresStatus({ solicitacoes }) {
  const pendentes  = solicitacoes.filter((s) => s.status === 'Pendente').length;
  const aprovadas  = solicitacoes.filter((s) => s.status === 'Aprovada').length;
  const rejeitadas = solicitacoes.filter((s) => s.status === 'Rejeitada').length;

  const contadores = [
    { label: 'Pendentes',  valor: pendentes,  cor: '#EAB308', fundo: '#FEF9C3' },
    { label: 'Aprovadas',  valor: aprovadas,  cor: '#22C55E', fundo: '#DCFCE7' },
    { label: 'Rejeitadas', valor: rejeitadas, cor: '#EF4444', fundo: '#FEE2E2' },
  ];

  return (
    <View style={estilos.contadoresRow}>
      {contadores.map((c) => (
        <View key={c.label} style={[estilos.contadorCard, { backgroundColor: c.fundo }]}>
          <Text style={[estilos.contadorValor, { color: c.cor }]}>{c.valor}</Text>
          <Text style={[estilos.contadorLabel, { color: c.cor }]}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function MyRequestsScreen() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando]     = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [erro, setErro]                 = useState('');

  // ── Carrega dados ─────────────────────────────────────────────────────────
  const carregarDados = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setCarregando(true);
    }
    setErro('');

    try {
      const dados = await minhasSolicitacoes();
      setSolicitacoes(dados && dados.length > 0 ? dados : MOCK_SOLICITACOES);
    } catch (err) {
      console.warn('[MyRequests] Usando dados mockados:', err.message);
      setSolicitacoes(MOCK_SOLICITACOES);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }, []);

  // Recarrega ao focar na tela
  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  // ── Renderização de cada card ─────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <RequestCard
      tipoEpi={item.tipo_epi}
      motivo={item.motivo}
      observacoes={item.observacoes}
      setor={item.setor}
      status={item.status}
      dataSolicitacao={item.data_solicitacao}
    />
  );

  // ── Tela de carregamento inicial ──────────────────────────────────────────
  if (carregando) {
    return (
      <SafeAreaView style={estilos.container}>
        <View style={estilos.header}>
          <Text style={estilos.headerTitulo}>Minhas Solicitações</Text>
        </View>
        <View style={estilos.carregandoContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={estilos.carregandoTexto}>Carregando solicitações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={estilos.header}>
        <View>
          <Text style={estilos.headerTitulo}>Minhas Solicitações</Text>
          <Text style={estilos.headerSubtitulo}>
            {solicitacoes.length} solicitação{solicitacoes.length !== 1 ? 'ões' : ''} registrada{solicitacoes.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={estilos.headerIcone}>
          <Ionicons name="list" size={22} color="#3B82F6" />
        </View>
      </View>

      {/* ── Lista de solicitações ─────────────────────────────────────────── */}
      <FlatList
        data={solicitacoes}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          estilos.listaContent,
          solicitacoes.length === 0 && estilos.listaVazia,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          solicitacoes.length > 0 ? (
            <ContadoresStatus solicitacoes={solicitacoes} />
          ) : null
        }
        ListEmptyComponent={<EstadoVazio />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => carregarDados(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
      />
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitulo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitulo: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  headerIcone: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Contadores de status
  contadoresRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  contadorCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  contadorValor: {
    fontSize: 22,
    fontWeight: '800',
  },
  contadorLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Lista
  listaContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  listaVazia: {
    flex: 1,
  },

  // Estado vazio
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  vazioIconeContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  vazioTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    textAlign: 'center',
  },
  vazioSubtitulo: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
  },

  // Carregando
  carregandoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  carregandoTexto: {
    fontSize: 15,
    color: '#64748B',
  },
});
