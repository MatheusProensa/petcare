const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const files = [
  'package.json',
  'app.json',
  'tsconfig.json',
  'index.ts',
  'App.tsx',
  'README.md',
  'docs/SQLITE_MIGRATION.md',
  'src/types/index.ts',
  'src/theme/index.tsx',
  'src/labels.ts',
  'src/utils/date.ts',
  'src/storage/index.ts',
  'src/storage/files.ts',
  'src/repositories/petsRepository.ts',
  'src/repositories/recordsRepository.ts',
  'src/repositories/weightsRepository.ts',
  'src/repositories/documentsRepository.ts',
  'src/repositories/medicationsRepository.ts',
  'src/repositories/backupRepository.ts',
  'src/repositories/onboardingRepository.ts',
  'src/services/events.ts',
  'src/services/notifications.ts',
  'src/services/pdf.ts',
  'src/services/share.ts',
  'src/services/demoData.ts',
  'src/hooks/useToast.tsx',
  'src/components/Button.tsx',
  'src/components/EmptyState.tsx',
  'src/components/HealthRecordCard.tsx',
  'src/components/Input.tsx',
  'src/components/MedicalProfileCard.tsx',
  'src/components/PetCard.tsx',
  'src/components/ReminderCard.tsx',
  'src/components/StatCard.tsx',
  'src/components/ThemeToggle.tsx',
  'src/components/TimelineItem.tsx',
  'src/components/WeightCard.tsx',
  'src/components/WeightChart.tsx',
  'src/screens/OnboardingScreen.tsx',
  'src/screens/DashboardScreen.tsx',
  'src/screens/HomeScreen.tsx',
  'src/screens/AddPetScreen.tsx',
  'src/screens/PetDetailScreen.tsx',
  'src/screens/AddRecordScreen.tsx',
  'src/screens/AddWeightScreen.tsx',
  'src/screens/WeightScreen.tsx',
  'src/screens/VaccinesScreen.tsx',
  'src/screens/MedicationsScreen.tsx',
  'src/screens/MedicalProfileScreen.tsx',
  'src/screens/EmergencyScreen.tsx',
  'src/screens/DocumentsScreen.tsx',
  'src/screens/DocumentViewerScreen.tsx',
  'src/screens/StatsScreen.tsx',
  'src/screens/SearchScreen.tsx',
  'src/screens/AboutScreen.tsx',
];

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const FEATURES_HTML = `
<h1>PetCare — Relatório Técnico do Projeto</h1>
<p class="subtitle">Prontuário de saúde para pets — Expo / React Native + TypeScript</p>

<h2>1. Visão geral</h2>
<p>O PetCare é um aplicativo mobile (Android/iOS/Web via Expo) para gerenciar a saúde de
pets: vacinas, consultas, medicamentos, peso, documentos, dados de emergência, busca,
backup e modo demonstração. Todos os dados são salvos localmente no dispositivo via
AsyncStorage, com uma camada de repositórios já preparada para uma futura migração para
SQLite.</p>

<h2>2. Stack tecnológica</h2>
<ul>
  <li><b>Expo</b> (SDK ~54) + <b>React Native</b> 0.81</li>
  <li><b>TypeScript</b></li>
  <li><b>React Navigation</b> (native-stack) para navegação entre telas</li>
  <li><b>AsyncStorage</b> para persistência local (chave/valor, dados versionados em JSON)</li>
  <li><b>expo-file-system</b>, <b>expo-sharing</b>, <b>expo-document-picker</b>,
      <b>expo-image-picker</b>, <b>expo-print</b>, <b>expo-notifications</b></li>
  <li>Tema próprio (light/dark) com tokens de cor, espaçamento, raio e tipografia em
      <code>src/theme/index.tsx</code></li>
</ul>

<h2>3. Funcionalidades por tela</h2>

<h3>Onboarding (OnboardingScreen)</h3>
<p>4 slides explicando os principais recursos do app (cadastro de pets, registros de
saúde, lembretes, documentos). Exibido apenas na primeira abertura, com flag persistida em
AsyncStorage (<code>onboardingRepository</code>). Botão "Começar" leva ao Dashboard.</p>

<h3>Dashboard (DashboardScreen) — Home principal</h3>
<ul>
  <li>Saudação dinâmica ("Bom dia/Boa tarde/Boa noite") + nome do app, logo da marca e
      toggle de tema claro/escuro.</li>
  <li>Cards de resumo: total de pets, alertas pendentes, remédios ativos.</li>
  <li>Ações rápidas: "Adicionar pet" e "Novo registro" (escolhe o pet automaticamente se
      houver só um, ou pergunta via Alert se houver vários).</li>
  <li>Seção de alertas prioritários (vacinas atrasadas, retornos, fim de tratamento).</li>
  <li>Seção "Próximos eventos" com botão "Ver mais".</li>
  <li>Seção "Últimos registros": os 3 registros mais recentes de todos os pets, com ícone,
      título, pet e data.</li>
  <li>Botão "Seus Pets" leva à lista completa (HomeScreen).</li>
  <li>Estado vazio com chamada para cadastrar o primeiro pet.</li>
</ul>

<h3>Lista de Pets (HomeScreen)</h3>
<p>Lista todos os pets cadastrados em cards (<code>PetCard</code>), mostrando foto/ícone,
nome, espécie/raça/idade, badges de remédios ativos e alertas pendentes. Toque abre o
prontuário do pet (PetDetail); botão "+" abre o cadastro de novo pet.</p>

<h3>Cadastro/edição de pet (AddPetScreen)</h3>
<p>Formulário com foto (galeria/câmera via expo-image-picker), nome, espécie, raça, data de
nascimento e ficha médica básica. Usado tanto para criar quanto editar (detecta
<code>petId</code> na rota). Salvamento com <code>Button</code> + toast de feedback.</p>

<h3>Prontuário do pet (PetDetailScreen)</h3>
<ul>
  <li>Cabeçalho com foto, nome, espécie/raça/idade e ações: compartilhar prontuário
      (PDF ou texto), editar pet, excluir pet.</li>
  <li>Atalhos rápidos para Vacinas, Peso, Documentos, Emergência, Estatísticas e
      Remédios.</li>
  <li>Card de ficha médica (castração, alergias, condições crônicas, tipo sanguíneo,
      veterinário).</li>
  <li><b>Linha do tempo</b> (SectionList agrupada por mês) com todos os eventos:
      vacinas, consultas, remédios, vermífugos, pesagens, documentos e observações.</li>
  <li>Chips de filtro rápido: Todos / Vacinas / Consultas / Remédios / Vermífugos / Peso /
      Documentos / Observações.</li>
  <li>Badges de status: "Em dia", "Reforço próximo", "Atrasada", "Reforço aplicado"
      (vacinas) e "Atrasado" / "Próximo" / "Concluído" / "Retorno realizado" / "Dose
      aplicada" (demais tipos).</li>
  <li>Toque em um item de registro abre edição; toque longo permite excluir.</li>
</ul>

<h3>Novo registro (AddRecordScreen)</h3>
<p>Formulário único e adaptável para os 5 tipos de registro: <b>vacina</b> (fabricante,
lote, clínica, data do reforço), <b>consulta</b> (veterinário, clínica, diagnóstico, data
de retorno), <b>medicamento</b> (dosagem, frequência contínua/temporária, data de término),
<b>vermífugo</b> (próxima dose) e <b>observação</b> (descrição livre). Suporta lembretes
configuráveis (dias antes do evento) e edição de registros existentes.</p>

<h3>Peso (WeightScreen / AddWeightScreen)</h3>
<p>Histórico de pesagens com gráfico de evolução (<code>WeightChart</code>) e lista de
registros (<code>WeightCard</code>). Cadastro/edição de peso (kg) com data.</p>

<h3>Vacinas (VaccinesScreen)</h3>
<p>"Carteira de vacinação" — lista todas as vacinas do pet com status calculado
(em dia / reforço próximo / atrasada / reforço aplicado), data de aplicação e próximo
reforço.</p>

<h3>Remédios (MedicationsScreen)</h3>
<ul>
  <li>Separa medicamentos em "Em uso" e "Finalizados".</li>
  <li>Badge "Contínuo" ou "Temporário" conforme a frequência.</li>
  <li>Barra de progresso do tratamento (baseada em data de início/término).</li>
  <li>Alerta de "fim do tratamento" quando faltam 3 dias ou menos.</li>
  <li>Botão "Marcar dose tomada" registra a dose (<code>MedicationDose</code>) e mostra
      "Última dose: há X horas/dias".</li>
</ul>

<h3>Ficha médica (MedicalProfileScreen)</h3>
<p>Edição de dados médicos do pet: castrado (sim/não), alergias, condições crônicas, tipo
sanguíneo, nome e telefone do veterinário, observações.</p>

<h3>Emergência (EmergencyScreen)</h3>
<p>Tela de acesso rápido com dados críticos do pet (alergias, condições, tipo sanguíneo,
contato do veterinário) e dados do tutor (nome e telefone), editáveis e salvos
localmente — pensada para ser mostrada rapidamente em uma emergência.</p>

<h3>Documentos (DocumentsScreen / DocumentViewerScreen)</h3>
<p>Upload de arquivos (exames, receitas, carteiras de vacinação, outros) via
document picker, com título, tipo e data. Visualização integrada do arquivo
(DocumentViewerScreen) e exclusão com confirmação.</p>

<h3>Estatísticas (StatsScreen)</h3>
<p>Resumo estatístico do prontuário do pet: quantidade de registros por tipo, evolução de
peso e outros indicadores agregados.</p>

<h3>Busca (SearchScreen)</h3>
<p>Busca global por título/descrição em todos os registros de todos os pets, com
navegação direta ao resultado.</p>

<h3>Sobre (AboutScreen)</h3>
<ul>
  <li>Logo, slogan e destaques da marca PetCare.</li>
  <li><b>Backup</b>: exportar dados como JSON (compartilhável), com data do último
      backup exibida.</li>
  <li><b>Restaurar backup</b>: lê o arquivo antes de aplicar e mostra um resumo
      (quantos pets/registros tem o backup, data de exportação, e quantos dados atuais
      serão substituídos) antes de confirmar — ação destrutiva com <code>Alert</code>.</li>
  <li><b>Modo demonstração</b>: botão que substitui os dados atuais por pets e histórico
      fictícios (<code>src/services/demoData.ts</code>), com confirmação.</li>
  <li>Toggle de tema claro/escuro.</li>
</ul>

<h2>4. Recursos transversais</h2>
<ul>
  <li><b>Tema claro/escuro</b> com paleta de marca PetCare (laranja), aplicado em toda a
      navegação.</li>
  <li><b>Toasts</b> de feedback ("salvo", "excluído", "dose registrada" etc.) via
      <code>ToastProvider</code>/<code>useToast</code>.</li>
  <li><b>Notificações locais</b> sincronizadas com os próximos eventos (vacinas,
      retornos, fim de tratamento) — <code>src/services/notifications.ts</code>.</li>
  <li><b>Compartilhamento</b> do prontuário em PDF ou texto
      (<code>src/services/pdf.ts</code> / <code>share.ts</code>).</li>
  <li><b>Backup/restore</b> em JSON, com versionamento de cada entidade salva
      (<code>src/storage/index.ts</code>).</li>
  <li><b>Camada de repositórios</b> (<code>src/repositories/*</code>): hoje são wrappers
      finos sobre o AsyncStorage, preparados para troca futura por SQLite sem alterar as
      telas (ver <code>docs/SQLITE_MIGRATION.md</code>).</li>
  <li><b>Acessibilidade</b>: <code>accessibilityRole</code>/<code>accessibilityLabel</code>
      em botões somente-ícone e <code>hitSlop</code> mínimo de 12px em alvos de toque.</li>
  <li><b>Performance</b>: componentes de lista (<code>PetCard</code>,
      <code>TimelineItem</code>, <code>ReminderCard</code>, <code>StatCard</code>)
      memoizados com <code>React.memo</code>; renderers de listas com
      <code>useCallback</code>.</li>
</ul>

<h2>5. Estrutura de pastas</h2>
<pre class="tree">${esc(fs.readFileSync(path.join(root, '.report-tree.txt'), 'utf8'))}</pre>

<h2>6. Código-fonte completo</h2>
<p>A seguir, o código-fonte de todos os arquivos do projeto (configuração, tipos, tema,
armazenamento, repositórios, serviços, componentes e telas).</p>
`;

let body = FEATURES_HTML + '<div class="page-break"></div><h2>Índice de arquivos</h2><ul class="toc">';
files.forEach((f, i) => {
  body += `<li><a href="#file-${i}">${esc(f)}</a></li>`;
});
body += '</ul><div class="page-break"></div>';

files.forEach((f, i) => {
  const full = path.join(root, f);
  let content = '';
  try {
    content = fs.readFileSync(full, 'utf8');
  } catch (e) {
    content = '// arquivo não encontrado: ' + f;
  }
  body += `<div class="file-section">
    <h3 id="file-${i}">${esc(f)}</h3>
    <pre><code>${esc(content)}</code></pre>
  </div>`;
});

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 18mm 14mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; line-height: 1.5; font-size: 12px; }
  h1 { font-size: 24px; color: #E8722C; margin-bottom: 4px; }
  h2 { font-size: 18px; color: #E8722C; border-bottom: 2px solid #E8722C; padding-bottom: 4px; margin-top: 28px; }
  h3 { font-size: 14px; color: #2a2a2a; margin-top: 18px; }
  .subtitle { color: #666; margin-top: 0; margin-bottom: 16px; font-size: 13px; }
  ul { margin: 4px 0 12px 0; padding-left: 22px; }
  li { margin-bottom: 4px; }
  code { font-family: 'Consolas', monospace; }
  pre { background: #1e1e1e; color: #d4d4d4; padding: 10px; border-radius: 6px;
        font-size: 9px; line-height: 1.35; overflow-x: auto; white-space: pre-wrap;
        word-wrap: break-word; }
  pre.tree { background: #f4f4f4; color: #333; font-size: 10px; }
  .toc { columns: 2; font-size: 11px; }
  .toc li { list-style: none; }
  .toc a { color: #1a1a1a; text-decoration: none; }
  .file-section { page-break-inside: avoid; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>${body}</body>
</html>`;

fs.writeFileSync(path.join(root, '.report.html'), html, 'utf8');
console.log('HTML written, files:', files.length, 'total chars:', html.length);
