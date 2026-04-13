// src/screens/EpiRequestScreen.js — Tela de solicitação de EPI
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { criarSolicitacao } from '../api/api';

// ── Opções de seleção ─────────────────────────────────────────────────────────
const TIPOS_EPI = [
  { valor: 'Capacete de Segurança',  icone: 'construct-outline' },
  { valor: 'Luva de Proteção',       icone: 'hand-left-outline' },
  { valor: 'Óculos de Proteção',     icone: 'glasses-outline'   },
  { valor: 'Cinto de Segurança',     icone: 'link-outline'      },
  { valor: 'Colete Refletivo',       icone: 'shirt-outline'     },
  { valor: 'Máscara de Proteção',    icone: 'medical-outline'   },
  { valor: 'Botina de Segurança',    icone: 'footsteps-outline' },
  { valor: 'Protetor Auditivo',      icone: 'ear-outline'       },
];

const MOTIVOS = [
  { valor: 'Equipamento danificado',  icone: 'build-outline'          },
  { valor: 'Equipamento perdido',     icone: 'search-outline'          },
  { valor: 'Novo funcionário',        icone: 'person-add-outline'     },
  { valor: 'Troca periódica',         icone: 'refresh-outline'        },
  { valor: 'Outro',                   icone: 'ellipsis-horizontal-outline' },
];

// ── Componente de seletor (substitui Picker nativo) ───────────────────────────
function Seletor({ titulo, opcoes, valorSelecionado, onSelecionar, erro }) {
  const [modalVisivel, setModalVisivel] = useState(false);

  const opcaoSelecionada = opcoes.find((o) => o.valor === valorSelecionado);

  return (
    <>
      <TouchableOpacity
        style={[estilos.seletorTrigger, erro && estilos.inputErro]}
        onPress={() => setModalVisivel(true)}
        activeOpacity={0.75}
      >
        {opcaoSelecionada ? (
          <View style={estilos.seletorSelecionado}>
            <Ionicons name={opcaoSelecionada.icone} size={18} color="#F97316" />
            <Text style={estilos.seletorTextoSelecionado}>{opcaoSelecionada.valor}</Text>
          </View>
        ) : (
          <Text style={estilos.seletorPlaceholder}>{titulo}</Text>
        )}
        <Ionicons name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      {/* Modal de seleção */}
      <Modal
        visible={modalVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisivel(false)}
      >
        <TouchableOpacity
          style={estilos.modalOverlay}
          onPress={() => setModalVisivel(false)}
          activeOpacity={1}
        >
          <View style={estilos.modalSheet}>
            {/* Alça */}
            <View style={estilos.modalAlca} />

            <Text style={estilos.modalTitulo}>{titulo}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {opcoes.map((opcao) => (
                <TouchableOpacity
                  key={opcao.valor}
                  style={[
                    estilos.modalOpcao,
                    valorSelecionado === opcao.valor && estilos.modalOpcaoSelecionada,
                  ]}
                  onPress={() => {
                    onSelecionar(opcao.valor);
                    setModalVisivel(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[
                    estilos.modalOpcaoIcone,
                    valorSelecionado === opcao.valor && { backgroundColor: '#FFF7ED' },
                  ]}>
                    <Ionicons
                      name={opcao.icone}
                      size={20}
                      color={valorSelecionado === opcao.valor ? '#F97316' : '#64748B'}
                    />
                  </View>
                  <Text style={[
                    estilos.modalOpcaoTexto,
                    valorSelecionado === opcao.valor && estilos.modalOpcaoTextoSelecionado,
                  ]}>
                    {opcao.valor}
                  </Text>
                  {valorSelecionado === opcao.valor && (
                    <Ionicons name="checkmark" size={18} color="#F97316" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Modal de sucesso ─────────────────────────────────────────────────────────
function ModalSucesso({ visivel, onFechar }) {
  return (
    <Modal visible={visivel} transparent animationType="fade">
      <View style={estilos.sucessoOverlay}>
        <View style={estilos.sucessoCard}>
          <View style={estilos.sucessoIconeContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          </View>
          <Text style={estilos.sucessoTitulo}>Solicitação enviada!</Text>
          <Text style={estilos.sucessoTexto}>
            O gestor foi notificado e irá analisar sua solicitação em breve.
            Acompanhe o status em "Minhas Solicitações".
          </Text>
          <TouchableOpacity style={estilos.sucessoBotao} onPress={onFechar}>
            <Text style={estilos.sucessoBotaoTexto}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────
export default function EpiRequestScreen() {
  const { user } = useAuth();

  // Estado do formulário
  const [tipoEpi, setTipoEpi]         = useState('');
  const [motivo, setMotivo]           = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [setor, setSetor]             = useState(user?.setor || 'Produção');

  // Estado de UI
  const [carregando, setCarregando]   = useState(false);
  const [sucesso, setSucesso]         = useState(false);
  const [erro, setErro]               = useState('');
  const [erros, setErros]             = useState({});

  // ── Validação ─────────────────────────────────────────────────────────────
  const validar = () => {
    const novosErros = {};
    if (!tipoEpi) novosErros.tipoEpi = 'Selecione o tipo de EPI';
    if (!motivo)  novosErros.motivo  = 'Selecione o motivo da solicitação';
    if (!setor.trim()) novosErros.setor = 'Informe o setor';
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // ── Envio ─────────────────────────────────────────────────────────────────
  const handleEnviar = async () => {
    if (!validar()) return;

    setCarregando(true);
    setErro('');
    try {
      await criarSolicitacao({
        tipo_epi: tipoEpi,
        motivo,
        observacoes: observacoes.trim(),
        setor: setor.trim(),
      });
      // Limpa o formulário
      setTipoEpi('');
      setMotivo('');
      setObservacoes('');
      setErros({});
      setSucesso(true);
    } catch (err) {
      setErro('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // ── Fechar modal de sucesso ───────────────────────────────────────────────
  const fecharSucesso = () => setSucesso(false);

  return (
    <SafeAreaView style={estilos.container}>
      {/* Modal de sucesso */}
      <ModalSucesso visivel={sucesso} onFechar={fecharSucesso} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={estilos.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={estilos.header}>
          <View style={estilos.headerIconeContainer}>
            <Ionicons name="shield-checkmark" size={28} color="#F97316" />
          </View>
          <View>
            <Text style={estilos.headerTitulo}>Solicitar EPI</Text>
            <Text style={estilos.headerSubtitulo}>Preencha os dados abaixo</Text>
          </View>
        </View>

        {/* ── Card do formulário ─────────────────────────────────────────── */}
        <View style={estilos.formularioCard}>

          {/* Tipo de EPI */}
          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>
              Tipo de EPI <Text style={estilos.obrigatorio}>*</Text>
            </Text>
            <Seletor
              titulo="Selecione o tipo de EPI"
              opcoes={TIPOS_EPI}
              valorSelecionado={tipoEpi}
              onSelecionar={(v) => { setTipoEpi(v); setErros({ ...erros, tipoEpi: undefined }); }}
              erro={!!erros.tipoEpi}
            />
            {erros.tipoEpi && <Text style={estilos.textoErro}>{erros.tipoEpi}</Text>}
          </View>

          {/* Motivo */}
          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>
              Motivo da Solicitação <Text style={estilos.obrigatorio}>*</Text>
            </Text>
            <Seletor
              titulo="Selecione o motivo"
              opcoes={MOTIVOS}
              valorSelecionado={motivo}
              onSelecionar={(v) => { setMotivo(v); setErros({ ...erros, motivo: undefined }); }}
              erro={!!erros.motivo}
            />
            {erros.motivo && <Text style={estilos.textoErro}>{erros.motivo}</Text>}
          </View>

          {/* Setor (auto-preenchido) */}
          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>
              Setor <Text style={estilos.obrigatorio}>*</Text>
            </Text>
            <View style={[estilos.inputWrapper, erros.setor && estilos.inputErro]}>
              <Ionicons name="business-outline" size={18} color="#94A3B8" style={estilos.inputIcone} />
              <TextInput
                style={estilos.input}
                value={setor}
                onChangeText={(t) => { setSetor(t); setErros({ ...erros, setor: undefined }); }}
                placeholder="Ex: Produção"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {erros.setor && <Text style={estilos.textoErro}>{erros.setor}</Text>}
          </View>

          {/* Observações */}
          <View style={estilos.campo}>
            <Text style={estilos.campoLabel}>
              Observações <Text style={estilos.opcional}>(opcional)</Text>
            </Text>
            <TextInput
              style={estilos.textArea}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Descreva detalhes adicionais sobre a solicitação..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Aviso de campos obrigatórios */}
          <Text style={estilos.avisoObrigatorio}>
            <Text style={estilos.obrigatorio}>*</Text> Campos obrigatórios
          </Text>

          {/* Erro global */}
          {erro ? (
            <View style={estilos.erroContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={estilos.erroTexto}>{erro}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Card informativo ───────────────────────────────────────────── */}
        <View style={estilos.infoCard}>
          <Ionicons name="information-circle" size={18} color="#3B82F6" />
          <Text style={estilos.infoTexto}>
            Após o envio, o gestor responsável receberá uma notificação e analisará sua solicitação.
            Prazo médio de resposta: <Text style={{ fontWeight: '700' }}>2 dias úteis</Text>.
          </Text>
        </View>

        {/* ── Botão de envio ─────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleEnviar}
          activeOpacity={0.85}
          disabled={carregando}
          style={estilos.botaoWrapper}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={estilos.botao}
          >
            {carregando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#FFFFFF" />
                <Text style={estilos.botaoTexto}>Enviar Solicitação</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    gap: 14,
  },
  headerIconeContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitulo: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitulo: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },

  // Card do formulário
  formularioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Campos
  campo: {
    marginBottom: 18,
  },
  campoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  obrigatorio: {
    color: '#EF4444',
    fontWeight: '700',
  },
  opcional: {
    color: '#94A3B8',
    fontWeight: '400',
    fontSize: 12,
  },

  // Seletor
  seletorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'space-between',
  },
  seletorSelecionado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  seletorTextoSelecionado: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  seletorPlaceholder: {
    fontSize: 15,
    color: '#94A3B8',
  },

  // Input de texto
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcone: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  inputErro: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#0F172A',
    minHeight: 100,
    lineHeight: 20,
  },

  // Erros
  textoErro: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 2,
  },
  erroContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginTop: 4,
  },
  erroTexto: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  avisoObrigatorio: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: -6,
  },

  // Card informativo
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  infoTexto: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 19,
  },

  // Botão
  botaoWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  botao: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 10,
    borderRadius: 12,
  },
  botaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal de seletor
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 8,
    maxHeight: '70%',
  },
  modalAlca: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginVertical: 12,
  },
  modalTitulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  modalOpcaoSelecionada: {
    backgroundColor: '#FFF7ED',
  },
  modalOpcaoIcone: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOpcaoTexto: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
  },
  modalOpcaoTextoSelecionado: {
    color: '#F97316',
    fontWeight: '600',
  },

  // Modal de sucesso
  sucessoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  sucessoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  sucessoIconeContainer: {
    marginBottom: 16,
  },
  sucessoTitulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  sucessoTexto: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  sucessoBotao: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  sucessoBotaoTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
