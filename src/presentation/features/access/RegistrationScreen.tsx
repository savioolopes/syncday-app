import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createContainer } from '../../../core/di/container';
import { colors, layout, radius, spacing } from '../../../core/theme';
import { RegistrationAddress, RegistrationKind } from '../../../domain/repositories';
import { getProfileRoute } from '../../navigation/profileRoutes';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { SelectableTile } from '../../components/ui/SelectableTile';
import { Typography } from '../../components/ui/Typography';
import { useSession } from '../../providers/SessionProvider';
import { validateRegistrationCredentials } from './registrationValidation';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';

const STREET_TYPES = ['RUA', 'AVENIDA', 'ALAMEDA', 'TRAVESSA', 'OUTRO'];

interface FormValues {
  nome: string;
  email: string;
  password: string;
  confirmPassword: string;
  documento: string;
  logoKey: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  unidadeFederativa: string;
}

const initialValues: FormValues = {
  nome: '',
  email: '',
  password: '',
  confirmPassword: '',
  documento: '',
  logoKey: '/logo.png',
  tipoLogradouro: 'RUA',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  municipio: '',
  unidadeFederativa: '',
};

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  rightElement?: React.ReactNode;
}

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'sentences',
  editable = true,
  rightElement,
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Typography variant="label">{label}</Typography>
      <View style={styles.inputWrapper}>
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onBlur={onBlur}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.disabledText}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          value={value}
        />
        {rightElement}
      </View>
    </View>
  );
}

export default function RegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [kind, setKind] = useState<RegistrationKind>('cliente');
  const [values, setValues] = useState(initialValues);
  const [showBusinessAddress, setShowBusinessAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionInProgress = useRef(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [loginWarning, setLoginWarning] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const handleCepBlur = async () => {
    const clean = values.cep.replace(/\D/g, '');
    if (clean.length !== 8) return;

    setCepLoading(true);
    setCepError(false);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
        redirect: 'manual',
      });
      if (resp.redirected || (resp.status >= 300 && resp.status < 400)) {
        throw new Error('Redirect not allowed');
      }
      const data = await resp.json();
      if (!data.erro) {
        update('logradouro', data.logradouro ?? '');
        update('bairro', data.bairro ?? '');
        update('municipio', data.localidade ?? '');
        update('unidadeFederativa', data.uf ?? '');
      } else {
        setCepError(true);
      }
    } catch {
      setCepError(true);
    } finally {
      setCepLoading(false);
    }
  };

  const handleCepChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    update('cep', clean);
    if (clean.length === 8) {
      // Auto-busca quando CEP completo
      setCepLoading(true);
      setCepError(false);
      fetch(`https://viacep.com.br/ws/${clean}/json/`, { redirect: 'manual' })
        .then((resp) => {
          if (resp.redirected || (resp.status >= 300 && resp.status < 400)) throw new Error('Redirect not allowed');
          return resp.json();
        })
        .then((data) => {
          if (!data.erro) {
            update('logradouro', data.logradouro ?? '');
            update('bairro', data.bairro ?? '');
            update('municipio', data.localidade ?? '');
            update('unidadeFederativa', data.uf ?? '');
            update('tipoLogradouro', data.tipo_logradouro ?? 'RUA');
          } else {
            setCepError(true);
          }
        })
        .catch(() => setCepError(true))
        .finally(() => setCepLoading(false));
    } else {
      // Limpa campos quando CEP incompleto
      update('logradouro', '');
      update('bairro', '');
      update('municipio', '');
      update('unidadeFederativa', '');
      update('tipoLogradouro', 'RUA');
      setCepError(false);
    }
  };

  const clearAddress = () => {
    update('cep', '');
    update('logradouro', '');
    update('numero', '');
    update('complemento', '');
    update('bairro', '');
    update('municipio', '');
    update('unidadeFederativa', '');
    update('tipoLogradouro', 'RUA');
    setCepError(false);
    setCepLoading(false);
  };

  const update = (key: keyof FormValues, value: string) => {
    setError('');
    setValues((current) => ({ ...current, [key]: value }));

    // Reset emailExists when email changes (will be set again on 409 error)
    if (key === 'email') {
      setEmailExists(false);
    }
  };

  const buildAddress = (): RegistrationAddress | undefined => {
    const addressFields = [
      values.logradouro,
      values.numero,
      values.bairro,
      values.cep,
      values.municipio,
      values.unidadeFederativa,
    ];
    const hasAddress = addressFields.some((value) => value.trim()) || showBusinessAddress;
    if (!hasAddress) return undefined;
    if (addressFields.some((value) => !value.trim())) {
      throw new Error('Preencha todos os campos obrigatórios do endereço.');
    }
    return {
      tipoLogradouro: values.tipoLogradouro,
      logradouro: values.logradouro.trim(),
      numero: values.numero.trim(),
      complemento: values.complemento.trim() || undefined,
      bairro: values.bairro.trim(),
      cep: values.cep.trim(),
      municipio: values.municipio.trim(),
      unidadeFederativa: values.unidadeFederativa.trim().toUpperCase(),
    };
  };

  const validate = () => {
    if (!values.nome.trim()) throw new Error(kind === 'cliente' ? 'Informe seu nome.' : 'Informe o nome do negócio.');
    const email = validateRegistrationCredentials(values.email, values.password, values.confirmPassword);
    const documento = values.documento.replace(/\D/g, '');
    const expectedDocumentLength = kind === 'cliente' ? 11 : 14;
    if (documento.length !== 0 && documento.length !== expectedDocumentLength) {
      throw new Error(kind === 'cliente' ? 'Informe um CPF com 11 dígitos ou deixe em branco.' : 'Informe um CNPJ com 14 dígitos.');
    }
    const endereco = buildAddress();
    if (endereco && endereco.cep.length !== 8) throw new Error('Informe um CEP com 8 dígitos.');
    if (endereco && endereco.unidadeFederativa.length !== 2) throw new Error('Informe a UF com 2 letras.');
    return { email, endereco };
  };

  const submit = async () => {
    if (submissionInProgress.current) return;
    submissionInProgress.current = true;
    setError('');
    setLoginWarning('');
    setSubmitting(true);
    try {
      const { email, endereco } = validate();
      setProgress('Preparando cadastro...');
      const { clientId } = await createContainer().usecases.registerAccount.execute(
        {
          kind,
          nome: values.nome.trim(),
          email,
          password: values.password,
          documento: values.documento.trim(),
          endereco,
          logoKey: kind === 'lojista' ? values.logoKey.trim() : undefined,
        },
        setProgress
      );

      if (kind === 'cliente') {
        if (!clientId) throw new Error('A API criou o perfil, mas não retornou o identificador do Cliente.');
        setCompleted(true);
        try {
          const nextSession = await signIn(email, values.password, clientId, values.nome.trim());
          router.replace(getProfileRoute(nextSession));
        } catch (signInError) {
          setLoginWarning(getUserFriendlyErrorMessage(signInError));
        }
      } else {
        setCompleted(true);
        try {
          const nextSession = await signIn(email, values.password);
          router.replace(getProfileRoute(nextSession));
        } catch (signInError) {
          setLoginWarning(getUserFriendlyErrorMessage(signInError));
        }
      }
    } catch (submitError) {
      // Melhor mensagem para o caso de e-mail já cadastrado mas senha errada durante o registro
      const errorMsg = submitError instanceof Error ? submitError.message : String(submitError);
      if (errorMsg.includes('Não foi possível autenticar no serviço de Autenticação') ||
          errorMsg.includes('Não foi possível criar a conta no serviço de Autenticação')) {
        // Usuário já existe - define emailExists para mostrar dicas contextuais
        setEmailExists(true);
        setError(
          'Este e-mail já possui uma conta. A senha deve ser a mesma da sua conta atual para vincular o perfil de ' +
          (kind === 'cliente' ? 'Cliente' : 'Lojista') + '.'
        );
      } else {
        setError(getUserFriendlyErrorMessage(submitError));
      }
    } finally {
      submissionInProgress.current = false;
      setSubmitting(false);
      setProgress('');
    }
  };

  const handleKindChange = (option: RegistrationKind) => {
    setKind(option);
    // Limpa todos os campos ao trocar de perfil
    setValues(initialValues);
    setShowBusinessAddress(false);
    setEmailExists(false);
    setError('');
    setLoginWarning('');
    setCepError(false);
    setCepLoading(false);
  };

  const field = (key: keyof FormValues) => (text: string) => update(key, text);

  return (
    <Screen statusBar="dark" background={colors.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable accessibilityRole="button" onPress={() => router.replace('/login')} style={styles.back}>
            <Typography variant="label" color={colors.blue}>‹  Voltar</Typography>
          </Pressable>

          {completed ? (
            <View style={styles.complete}>
              <Typography variant="display" size={30}>Cadastro concluído!</Typography>
              <Typography variant="body" color={colors.muted}>
                {kind === 'cliente'
                  ? 'Sua conta e seu perfil de Cliente foram criados.'
                  : 'Sua conta e seu perfil de Lojista foram criados.'}
              </Typography>
              {loginWarning ? (
                <>
                  <Typography variant="body" color={colors.orange}>{loginWarning}</Typography>
                  <Button label="Ir para entrar" onPress={() => router.replace('/login')} />
                </>
              ) : null}
              {kind === 'lojista' ? (
                <Button label="Voltar ao início" variant="outline" onPress={() => router.replace('/')} />
              ) : null}
            </View>
          ) : (
            <>
              <Typography variant="display" size={30}>Criar conta</Typography>
              <Typography variant="body" color={colors.muted} style={styles.intro}>
                Escolha o tipo de cadastro. Usaremos seu e-mail para entrar no app.
              </Typography>

              <View style={styles.kindRow}>
                {(['cliente', 'lojista'] as const).map((option) => (
                  <SelectableTile
                    key={option}
                    selected={kind === option}
                    disabled={submitting}
                    onPress={() => handleKindChange(option)}
                    style={styles.kindOption}
                    accessibilityLabel={option === 'cliente' ? 'Cadastrar como Cliente' : 'Cadastrar como Lojista'}
                    textColor={kind === option ? colors.white : colors.ink}
                  >
                    <Typography variant="label" color={kind === option ? colors.white : colors.ink}>
                      {option === 'cliente' ? 'Cliente' : 'Lojista'}
                    </Typography>
                  </SelectableTile>
                ))}
              </View>

              <Card style={styles.form}>
                <Field
                  label={kind === 'cliente' ? 'Nome completo' : 'Nome do negócio'}
                  value={values.nome}
                  onChangeText={field('nome')}
                  placeholder={kind === 'cliente' ? 'Seu nome' : 'Nome empresarial'}
                  editable={!submitting}
                />
                <Field
                  label="E-mail"
                  value={values.email}
                  onChangeText={field('email')}
                  placeholder="voce@exemplo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!submitting}
                  rightElement={null}
                />
                {(emailExists) && (
                  <Typography variant="caption" color={colors.blue} style={styles.emailHint}>
                    Este e-mail já possui uma conta. Use a mesma senha para adicionar o perfil de {kind === 'cliente' ? 'Cliente' : 'Lojista'}.
                  </Typography>
                )}
                <Field
                  label={kind === 'cliente' ? 'CPF' : 'CNPJ'}
                  value={values.documento}
                  onChangeText={(text) => update('documento', text.replace(/\D/g, ''))}
                  placeholder={kind === 'cliente' ? 'Somente números' : 'Somente números'}
                  keyboardType="number-pad"
                  maxLength={kind === 'cliente' ? 11 : 14}
                  autoCapitalize="none"
                  editable={!submitting}
                />
                <Field
                  label={emailExists ? 'Senha (a mesma da conta existente)' : 'Senha'}
                  value={values.password}
                  onChangeText={field('password')}
                  placeholder={emailExists ? 'Digite a senha da sua conta' : 'Mínimo de 8 caracteres'}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!submitting}
                />
                {emailExists && (
                  <Typography variant="caption" color={colors.blue} style={styles.emailHint}>
                    A senha deve ser igual à da sua conta atual para vincular os perfis.
                  </Typography>
                )}
                <Field
                  label={emailExists ? 'Confirmar senha (a mesma da conta existente)' : 'Confirmar senha'}
                  value={values.confirmPassword}
                  onChangeText={field('confirmPassword')}
                  placeholder={emailExists ? 'Digite a senha novamente' : 'Digite a senha novamente'}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!submitting}
                />
                {kind === 'lojista' && (
                  <Field
                    label="Logo (chave)"
                    value={values.logoKey}
                    onChangeText={field('logoKey')}
                    placeholder="/logo.png"
                    autoCapitalize="none"
                    editable={!submitting}
                  />
                )}
              </Card>

              {kind === 'cliente' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, expanded: showBusinessAddress }}
                  disabled={submitting}
                  onPress={() => {
                    if (showBusinessAddress) {
                      clearAddress();
                    }
                    setShowBusinessAddress((current) => !current);
                  }}
                  style={styles.addressToggle}
                >
                  <Typography variant="heading">Endereço (opcional)</Typography>
                  <Typography variant="label" color={colors.blue}>
                    {showBusinessAddress ? 'Remover' : 'Adicionar'}
                  </Typography>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting, expanded: showBusinessAddress }}
                  disabled={submitting}
                  onPress={() => {
                    if (showBusinessAddress) {
                      clearAddress();
                    }
                    setShowBusinessAddress((current) => !current);
                  }}
                  style={styles.addressToggle}
                >
                  <Typography variant="heading">Endereço do negócio (opcional)</Typography>
                  <Typography variant="label" color={colors.blue}>
                    {showBusinessAddress ? 'Remover' : 'Adicionar'}
                  </Typography>
                </Pressable>
              )}

              {showBusinessAddress ? (
                <Card style={styles.form}>
                  <View style={styles.cepInputWrapper}>
                    <Field
                      label="CEP"
                      value={values.cep}
                      onChangeText={handleCepChange}
                      keyboardType="number-pad"
                      maxLength={8}
                      editable={!submitting}
                    />
                    <View style={styles.cepStatus}>
                      {cepLoading && <ActivityIndicator size="small" color={colors.blue} />}
                      {cepError && <Typography variant="caption" color={colors.orange}>✗</Typography>}
                    </View>
                  </View>
                  <Field label="Logradouro" value={values.logradouro} onChangeText={field('logradouro')} placeholder="Rua das Flores" maxLength={255} editable={!submitting} />
                  <View style={styles.twoColumns}>
                    <View style={styles.columnLeft}>
                      <Field label="Número" value={values.numero} onChangeText={field('numero')} placeholder="123" maxLength={10} editable={!submitting} />
                    </View>
                    <View style={styles.columnRight}>
                      <Field label="Complemento" value={values.complemento} onChangeText={field('complemento')} placeholder="Apto, sala..." maxLength={60} editable={!submitting} />
                    </View>
                  </View>
                  <Field label="Bairro" value={values.bairro} onChangeText={field('bairro')} maxLength={100} editable={!submitting} />
                  <View style={styles.twoColumns}>
                    <View style={styles.columnLeft}>
                      <Field label="UF" value={values.unidadeFederativa} onChangeText={(text) => update('unidadeFederativa', text.toUpperCase())} maxLength={2} autoCapitalize="characters" editable={!submitting} />
                    </View>
                    <View style={styles.columnRight}>
                      <Field label="Município" value={values.municipio} onChangeText={field('municipio')} maxLength={150} editable={!submitting} />
                    </View>
                  </View>
                </Card>
              ) : null}

              {!process.env.EXPO_PUBLIC_API_URL ? (
                <Typography variant="body" color={colors.orange} style={styles.error}>
                  Configure EXPO_PUBLIC_API_URL antes de cadastrar.
                </Typography>
              ) : null}
              {error ? <Typography variant="body" color={colors.orange} style={styles.error}>{error}</Typography> : null}
              {progress ? <Typography variant="caption" color={colors.muted}>{progress}</Typography> : null}

              <Button
                label={submitting ? 'Cadastrando...' : 'Criar conta'}
                loading={submitting}
                disabled={!process.env.EXPO_PUBLIC_API_URL || submitting}
                onPress={() => {
                  Keyboard.dismiss();
                  void submit();
                }}
                style={styles.submit}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.screen,
    gap: 14,
  },
  back: { paddingVertical: 4, alignSelf: 'flex-start' },
  intro: { marginTop: -6 },
  kindRow: { flexDirection: 'row', gap: 10 },
  kindOption: { flex: 1 },
  form: { gap: 14, width: '100%' },
  field: { gap: 7 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    color: colors.ink,
    backgroundColor: colors.white,
    fontSize: 16,
    flex: 1,
  },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cepStatus: { position: 'absolute', right: 14, top: '50%', transform: [{ translateY: -10 }] },
  cepInputWrapper: { position: 'relative' },
  addressTitle: { marginTop: 4 },
  addressToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  streetTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  streetType: { minWidth: 84, paddingHorizontal: 8 },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  columnLeft: { flex: 1, minWidth: 205 },
  columnRight: { flex: 1, minWidth: 205 },
  error: { marginTop: 2 },
  submit: { marginTop: 4 },
  complete: { flex: 1, justifyContent: 'center', gap: 16, paddingVertical: 40 },
  emailHint: { marginTop: -8, marginBottom: 4, marginLeft: 2 },
});
