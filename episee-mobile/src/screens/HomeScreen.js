// src/screens/HomeScreen.js — Tela principal do trabalhador
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// ── Dicas de segurança rotativas ──────────────────────────────────────────────
const DICAS_SEGURANCA = [
  { texto: 'Verifique seu capacete antes de cada uso. Trincas ou amassados reduzem a proteção.', icone: 'construct' },
  { texto: 'Nunca empreste ou use o EPI de outro trabalhador. Cada equipamento é ajustado para o usuário.', icone: 'people' },
  { texto: 'O Certificado de Aprovação (CA) garante que seu EPI foi testado e aprovado pelo MTE.', icone: 'ribbon' },
  { texto: 'Luvas protegem suas mãos de cortes, queimaduras e agentes químicos. Use sempre!', icone: 'hand-left' },
  { texto: 'Óculos de proteção devem ser limpos diariamente para garantir boa visibilidade.', icone: 'glasses' },
  { texto: 'Protetores auditivos reduzem o risco de perda auditiva em ambientes ruidosos. Não esqueça!', icone: 'ear' },
  { texto: 'A botina de segurança com biqueira de aço protege seus pés de quedas de objetos pesados.', icone: 'footsteps' },
];

// ── Checklist mockado de status dos EPIs ─────────────────────────────────────
const STATUS_EPIS = [
  { item: 'Capacete de Segurança', ok: true,  prazo: 'Válido até 01/06/2025' },
  { item: 'Luvas de Proteção',     ok: true,  prazo: 'Válido até 15/03/2025' },
  { item: 'Óculos de Proteção',    ok: false, prazo: 'Substituição pendente'  },
  { item: 'Protetor Auditivo',     ok: true,  prazo: 'Válido até 01/08/2025' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();

  // Dica do dia: baseada no dia do mês para ser consistente
  const dica = DICAS_SEGURANCA[new Date().getDate() % DICAS_SEGURANCA.length];

  // Saudação baseada no horário
  const hora    = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  // Data formatada
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const dataFormatada = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1);

  // ── Atalhos rápidos ─────────────────────────────────────────────────────
  const atalhos = [
    {
      icone: 'shield-checkmark',
      cor: '#F97316',
      fundo: '#FFF7ED',
      titulo: 'Solicitar EPI',
      onPress: () => navigation.navigate('SolicitarEPI'),
    },
    {
      icone: 'list',
      cor: '#3B82F6',
      fundo: '#EFF6FF',
      titulo: 'Solicitações',
      onPress: () => navigation.navigate('MinhasSolicitacoes'),
    },
    {
      icone: 'book',
      cor: '#22C55E',
      fundo: '#F0FDF4',
      titulo: 'Consultar NR-6',
      onPress: () => navigation.navigate('NR6'),
    },
    {
      icone: 'chatbubble-ellipses',
      cor: '#A855F7',
      fundo: '#FAF5FF',
      titulo: 'Assistente IA',
      onPress: () => navigation.navigate('Chat'),
    },
  ];

  return (
    <SafeAreaView style={estilos.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={estilos.header}>
          <View>
            <Text style={estilos.saudacao}>{saudacao},</Text>
            <Text style={estilos.nomeUsuario}>{user?.nome || 'Trabalhador'} 👷</Text>
            <Text style={estilos.dataHoje}>{dataFormatada}</Text>
          </View>
          <TouchableOpacity
            style={estilos.avatarHeader}
            onPress={() => navigation.navigate('Perfil')}
          >
            <Text style={estilos.avatarLetra}>
              {(user?.nome || 'U')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Card de boas-vindas (banner laranja) ─────────────────────── */}
        <LinearGradient
          colors={['#F97316', '#EA580C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={estilos.bannerCard}
        >
          {/* Círculos decorativos */}
          <View style={estilos.bannerCirculo1} />
          <View style={estilos.bannerCirculo2} />

          <View style={estilos.bannerConteudo}>
            <Ionicons name="shield-checkmark" size={40} color="rgba(255,255,255,0.9)" />
            <View style={estilos.bannerTextos}>
              <Text style={estilos.bannerTitulo}>Seu setor: {user?.setor || 'Produção'}</Text>
              <Text style={estilos.bannerSubtitulo}>
                Mantenha seus EPIs sempre em ordem e trabalhe com segurança!
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── Atalhos rápidos 2x2 ───────────────────────────────────────── */}
        <Text style={estilos.secaoTitulo}>Acesso Rápido</Text>
        <View style={estilos.atalhoGrid}>
          {atalhos.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[estilos.atalhoCard, { backgroundColor: item.fundo }]}
              onPress={item.onPress}
              activeOpacity={0.75}
            >
              <View style={[estilos.atalhoIconeContainer, { backgroundColor: item.cor + '22' }]}>
                <Ionicons name={item.icone} size={28} color={item.cor} />
              </View>
              <Text style={[estilos.atalhoTitulo, { color: item.cor }]}>{item.titulo}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Dica de segurança do dia ─────────────────────────────────── */}
        <Text style={estilos.secaoTitulo}>Dica de Segurança do Dia</Text>
        <View style={estilos.dicaCard}>
          <View style={estilos.dicaIconeContainer}>
            <Ionicons name={dica.icone} size={24} color="#F97316" />
          </View>
          <View style={estilos.dicaConteudo}>
            <Text style={estilos.dicaLabel}>💡 Sabia disso?</Text>
            <Text style={estilos.dicaTexto}>{dica.texto}</Text>
          </View>
        </View>

        {/* ── Status dos EPIs ───────────────────────────────────────────── */}
        <Text style={estilos.secaoTitulo}>Status dos seus EPIs</Text>
        <View style={estilos.statusCard}>
          {STATUS_EPIS.map((item, index) => (
            <View
              key={index}
              style={[
                estilos.statusRow,
                index === STATUS_EPIS.length - 1 && estilos.statusRowUltimo,
              ]}
            >
              <Ionicons
                name={item.ok ? 'checkmark-circle' : 'alert-circle'}
                size={20}
                color={item.ok ? '#22C55E' : '#EAB308'}
              />
              <View style={estilos.statusTextos}>
                <Text style={estilos.statusNome}>{item.item}</Text>
                <Text style={[
                  estilos.statusPrazo,
                  { color: item.ok ? '#64748B' : '#EAB308' }
                ]}>
                  {item.prazo}
                </Text>
              </View>
              <View style={[
                estilos.statusBadge,
                { backgroundColor: item.ok ? '#DCFCE7' : '#FEF9C3' }
              ]}>
                <Text style={[
                  estilos.statusBadgeTexto,
                  { color: item.ok ? '#16A34A' : '#A16207' }
                ]}>
                  {item.ok ? 'OK' : 'Atenção'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Rodapé */}
        <Text style={estilos.rodape}>EPIsee — Sistema de Segurança do Trabalho v1.0.0</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 20,
  },
  saudacao: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '400',
  },
  nomeUsuario: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  dataHoje: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  avatarHeader: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarLetra: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Banner card
  bannerCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
    minHeight: 110,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerCirculo1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    right: -30,
    top: -40,
  },
  bannerCirculo2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: 50,
    bottom: -30,
  },
  bannerConteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bannerTextos: {
    flex: 1,
  },
  bannerTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  bannerSubtitulo: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },

  // Seção título
  secaoTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },

  // Grid de atalhos
  atalhoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  atalhoCard: {
    width: '47.5%',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  atalhoIconeContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  atalhoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Dica do dia
  dicaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  dicaIconeContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dicaConteudo: {
    flex: 1,
  },
  dicaLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
    marginBottom: 6,
  },
  dicaTexto: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },

  // Status EPIs
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  statusRowUltimo: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  statusTextos: {
    flex: 1,
  },
  statusNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  statusPrazo: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeTexto: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Rodapé
  rodape: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
  },
});
