// src/screens/ProfileScreen.js — Tela de perfil do trabalhador
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// ── Componente de item de informação ─────────────────────────────────────────
function ItemInfo({ icone, label, valor, corIcone = '#64748B', ultimo = false }) {
  return (
    <View style={[estilos.itemRow, ultimo && estilos.itemRowUltimo]}>
      <View style={[estilos.itemIconeContainer, { backgroundColor: corIcone + '18' }]}>
        <Ionicons name={icone} size={16} color={corIcone} />
      </View>
      <View style={estilos.itemTextos}>
        <Text style={estilos.itemLabel}>{label}</Text>
        <Text style={estilos.itemValor}>{valor}</Text>
      </View>
    </View>
  );
}

// ── Componente de seção de card ───────────────────────────────────────────────
function SecaoCard({ titulo, icone, corIcone = '#F97316', children }) {
  return (
    <View style={estilos.secaoCard}>
      <View style={estilos.secaoCabecalho}>
        <View style={[estilos.secaoIcone, { backgroundColor: corIcone + '18' }]}>
          <Ionicons name={icone} size={17} color={corIcone} />
        </View>
        <Text style={estilos.secaoTitulo}>{titulo}</Text>
      </View>
      <View style={estilos.secaoConteudo}>{children}</View>
    </View>
  );
}

// ── Formata data ISO para dd/mm/aaaa ─────────────────────────────────────────
function formatarData(dataISO) {
  if (!dataISO) return '—';
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ── Tela de perfil ────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout } = useAuth();

  // Preferências locais (mockadas)
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(true);

  // Inicial do nome para o avatar
  const inicial = (user?.nome || 'U')[0].toUpperCase();

  // ── Confirma logout ───────────────────────────────────────────────────────
  const confirmarLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair do EPIsee?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={estilos.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
      >
        {/* ── Header / Avatar ───────────────────────────────────────────── */}
        <View style={estilos.headerContainer}>
          {/* Background gradient decorativo */}
          <LinearGradient
            colors={['#0F172A', '#1E293B']}
            style={estilos.headerGradiente}
          >
            <View style={estilos.headerDecorCirculo1} />
            <View style={estilos.headerDecorCirculo2} />
          </LinearGradient>

          {/* Avatar circular com inicial */}
          <View style={estilos.avatarContainer}>
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              style={estilos.avatarGradiente}
            >
              <Text style={estilos.avatarLetra}>{inicial}</Text>
            </LinearGradient>
            {/* Anel de status (online) */}
            <View style={estilos.avatarStatus} />
          </View>

          {/* Nome e email */}
          <Text style={estilos.nomeUsuario}>{user?.nome || 'João Silva'}</Text>
          <Text style={estilos.emailUsuario}>{user?.email || 'demo@episee.com'}</Text>

          {/* Badge de setor */}
          <View style={estilos.setorBadge}>
            <Ionicons name="briefcase" size={13} color="#F97316" />
            <Text style={estilos.setorTexto}>{user?.setor || 'Produção'}</Text>
          </View>
        </View>

        {/* ── Seção: Informações ────────────────────────────────────────── */}
        <SecaoCard titulo="Informações" icone="person-circle" corIcone="#3B82F6">
          <ItemInfo
            icone="briefcase-outline"
            label="Cargo"
            valor={user?.cargo || 'Operador de Máquinas'}
            corIcone="#3B82F6"
          />
          <ItemInfo
            icone="business-outline"
            label="Setor"
            valor={user?.setor || 'Produção'}
            corIcone="#22C55E"
          />
          <ItemInfo
            icone="call-outline"
            label="Telefone"
            valor={user?.telefone || '(11) 99999-8888'}
            corIcone="#A855F7"
          />
          <ItemInfo
            icone="calendar-outline"
            label="Membro desde"
            valor={formatarData(user?.membro_desde || '2023-03-15')}
            corIcone="#EAB308"
            ultimo
          />
        </SecaoCard>

        {/* ── Seção: Preferências ───────────────────────────────────────── */}
        <SecaoCard titulo="Preferências" icone="settings-outline" corIcone="#64748B">
          <View style={estilos.preferenciasRow}>
            <View style={estilos.preferenciasInfo}>
              <View style={[estilos.preferenciasIcone, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="notifications-outline" size={18} color="#F97316" />
              </View>
              <View>
                <Text style={estilos.preferenciasLabel}>Notificações de alerta</Text>
                <Text style={estilos.preferenciasDesc}>
                  Atualizações sobre suas solicitações
                </Text>
              </View>
            </View>
            <Switch
              value={notificacoesAtivas}
              onValueChange={setNotificacoesAtivas}
              trackColor={{ false: '#E2E8F0', true: '#FED7AA' }}
              thumbColor={notificacoesAtivas ? '#F97316' : '#94A3B8'}
              ios_backgroundColor="#E2E8F0"
            />
          </View>
        </SecaoCard>

        {/* ── Seção: Suporte ────────────────────────────────────────────── */}
        <SecaoCard titulo="Suporte" icone="help-circle-outline" corIcone="#06B6D4">
          <TouchableOpacity style={estilos.suporteRow} activeOpacity={0.7}>
            <View style={[estilos.itemIconeContainer, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="document-text-outline" size={16} color="#22C55E" />
            </View>
            <Text style={estilos.suporteTexto}>Manual do Usuário</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
          <View style={estilos.suporteDivisor} />
          <TouchableOpacity style={estilos.suporteRow} activeOpacity={0.7}>
            <View style={[estilos.itemIconeContainer, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color="#22C55E" />
            </View>
            <Text style={estilos.suporteTexto}>Fale com o Suporte</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
          <View style={estilos.suporteDivisor} />
          <TouchableOpacity style={estilos.suporteRow} activeOpacity={0.7}>
            <View style={[estilos.itemIconeContainer, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
            </View>
            <Text style={estilos.suporteTexto}>Sobre o EPIsee</Text>
            <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </SecaoCard>

        {/* ── Botão de sair ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={estilos.botaoSair}
          onPress={confirmarLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={estilos.botaoSairTexto}>Sair da conta</Text>
        </TouchableOpacity>

        {/* ── Versão do app ─────────────────────────────────────────────── */}
        <View style={estilos.versaoContainer}>
          <Ionicons name="shield-checkmark" size={16} color="#CBD5E1" />
          <Text style={estilos.versaoTexto}>EPIsee v1.0.0 · Segurança do Trabalho</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scroll: {
    paddingBottom: 40,
  },

  // Header com avatar
  headerContainer: {
    alignItems: 'center',
    paddingBottom: 28,
    marginBottom: 8,
    overflow: 'hidden',
  },
  headerGradiente: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    overflow: 'hidden',
  },
  headerDecorCirculo1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    right: -50,
    top: -60,
  },
  headerDecorCirculo2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    left: -20,
    bottom: -20,
  },

  // Avatar
  avatarContainer: {
    marginTop: 32,
    marginBottom: 14,
    position: 'relative',
  },
  avatarGradiente: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarLetra: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarStatus: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    bottom: 2,
    right: 2,
  },

  // Nome e email
  nomeUsuario: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emailUsuario: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },

  // Badge de setor
  setorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  setorTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
  },

  // Card de seção
  secaoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  secaoIcone: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  secaoConteudo: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },

  // Item de informação
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  itemRowUltimo: {
    borderBottomWidth: 0,
  },
  itemIconeContainer: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTextos: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 2,
  },
  itemValor: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },

  // Preferências
  preferenciasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  preferenciasInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  preferenciasIcone: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenciasLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  preferenciasDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },

  // Suporte
  suporteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  suporteDivisor: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  suporteTexto: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },

  // Botão de sair
  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  botaoSairTexto: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Versão
  versaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  versaoTexto: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
  },
});
