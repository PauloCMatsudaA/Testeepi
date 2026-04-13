// src/screens/MyRequestsScreen.js
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

// A API retorna status em inglês — traduz para português
const traduzirStatus = (status) => {
  const mapa = {
    pending:  'Pendente',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
  };
  return mapa[status] || status;
};

// ── Componente de estado vazio ─────────────────────────────────────────────────
function EstadoVazio() {
  return (
    <View style={estilos.vazio}>
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

// ── Contadores de status ───────────────────────────────────────────────────────
function ContadoresStatus({ solicitacoes }) {
  const pendentes  = solicitacoes.filter((s) => traduzirStatus(s.status) === 'Pendente').length;
  const aprovadas  = solicitacoes.filter((s) => traduzirStatus(s.status) === 'Aprovada').length;
  const rejeitadas = solicitacoes.filter((s) => traduzirStatus(s.status) === 'Rejeitada').length;

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

  const carregarDados = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setCarregando(true);

    try {
      const dados = await minhasSolicitacoes();
      setSolicitacoes(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.warn('[MyRequests] Erro ao carregar:', err.message);
      setSolicitacoes([]);
    } finally {
      setCarregando(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  // Mapeia campos da API para o que o RequestCard espera
  const renderItem = ({ item }) => (
    <RequestCard
      tipoEpi={item.epi_type || item.tipo_epi || '—'}
      motivo={item.reason || item.motivo || '—'}
      observacoes={item.observacoes || ''}
      setor={item.setor || 'Geral'}
      status={traduzirStatus(item.status)}
      dataSolicitacao={item.created_at || item.data_solicitacao}
    />
  );

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
      />
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitulo: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  headerSubtitulo: { fontSize: 13, color: '#64748B', marginTop: 3 },
  headerIcone: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  contadoresRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  contadorCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  contadorValor: { fontSize: 22, fontWeight: '800' },
  contadorLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  listaContent: { paddingHorizontal: 16, paddingBottom: 30 },
  listaVazia: { flex: 1 },
  vazio: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 60, paddingHorizontal: 32,
  },
  vazioIconeContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, borderWidth: 2,
    borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  vazioTitulo: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 10, textAlign: 'center' },
  vazioSubtitulo: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 21 },
  carregandoContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  carregandoTexto: { fontSize: 15, color: '#64748B' },
});