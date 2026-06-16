# PetCare — Ficha da Play Store

Tudo pronto para copiar e colar na Play Console.

---

## 1. TÍTULO DO APP
(máx. 30 caracteres)

```
PetCare — Saúde do seu pet
```

---

## 2. DESCRIÇÃO CURTA
(máx. 80 caracteres — aparece nos resultados de busca)

```
Vacinas, remédios, peso e memórias do seu pet em um só lugar.
```

---

## 3. DESCRIÇÃO COMPLETA
(máx. 4000 caracteres)

```
PetCare é o prontuário digital do seu pet — um app simples e bonito para acompanhar vacinas, remédios, consultas, peso e muito mais, tudo salvo no próprio celular, sem precisar de conta ou internet.

🐾 CARTEIRA DE VACINAÇÃO DIGITAL
Registre cada vacina com fabricante, lote e clínica. O app avisa quando o reforço está chegando e reconhece vacinas equivalentes de marcas diferentes (como Nobivac e Vanguard) para evitar duplicatas.

💊 CONTROLE DE REMÉDIOS
Acompanhe remédios em uso com data de início, fim, dosagem e frequência. Receba lembretes de dose no horário certo — 1x ao dia, 2x ao dia, a cada 8h ou 12h.

📊 EVOLUÇÃO DE PESO
Registre pesagens e acompanhe o crescimento do seu pet com gráfico de evolução ao longo do tempo.

❤️ LINHA DA VIDA
Uma timeline completa com toda a história do seu pet — desde o dia em que chegou ao lar até a última consulta. Filtre por vacinas, consultas, memórias, remédios e muito mais. Exporte em PDF para compartilhar com o veterinário.

📸 MEMÓRIAS
Registre momentos especiais com fotos, título e descrição. O app lembra você todo ano na data da memória.

🚨 CARTÃO DE EMERGÊNCIA
Informações rápidas do tutor, veterinário, alergias e condições de saúde — sempre disponíveis, mesmo sem internet, para mostrar no pronto-socorro.

📄 DOCUMENTOS E EXAMES
Anexe carteirinhas, receitas e exames em PDF diretamente no prontuário do seu pet.

🔔 LEMBRETES INTELIGENTES
Notificações para reforços de vacina, consultas de retorno, doses de remédio e eventos marcantes. O app também envia um resumo matinal quando há itens pendentes.

✈️ KIT VIAGEM
Gere um PDF com as vacinas, medicamentos ativos e contatos de emergência para levar em viagens ou consultas.

📱 DESIGN PREMIUM
Interface limpa com suporte a modo escuro e claro, fontes premium e identidade visual exclusiva.

🔒 PRIVACIDADE TOTAL
Todos os dados ficam salvos no seu celular. O app não cria conta, não acessa a internet e não compartilha nenhuma informação com terceiros.

Compatível com cães, gatos, pássaros e outros pets.
```

---

## 4. NOTAS DE LANÇAMENTO — versão 1.0.0
(máx. 500 caracteres — aba "O que há de novo")

```
Primeira versão do PetCare! 🐾

• Carteira de vacinação digital com alertas de reforço
• Controle de remédios com lembretes de dose
• Evolução de peso com gráfico
• Linha da Vida — toda a história do seu pet em uma timeline
• Memórias com fotos
• Cartão de emergência
• Kit Viagem em PDF
• Modo escuro e claro
```

---

## 5. CATEGORIA E CLASSIFICAÇÃO

- **Categoria**: Estilo de vida
- **Subcategoria**: Animais de estimação
- **Classificação indicativa**: Livre (responder "Não" para todas as perguntas do questionário de conteúdo)

---

## 6. INFORMAÇÕES DO APP

- **E-mail de suporte**: matheu.proensa@gmail.com
- **Política de privacidade**: (ver seção 7 abaixo — hospedar no GitHub Pages ou Notion)

---

## 7. POLÍTICA DE PRIVACIDADE

Hospedar este texto numa URL pública (ex: GitHub Pages, Notion, Google Sites) e colocar o link na Play Console.

---

**Política de Privacidade — PetCare**

*Última atualização: junho de 2026*

**1. Coleta de dados**
O PetCare não coleta, armazena nem transmite nenhum dado pessoal para servidores externos. Todas as informações inseridas no app (nome do pet, vacinas, remédios, fotos, documentos) ficam salvas exclusivamente no armazenamento local do seu dispositivo.

**2. Permissões utilizadas**
- **Câmera e Galeria**: usadas apenas para adicionar fotos do pet e registrar memórias. As fotos são salvas somente no dispositivo.
- **Notificações**: usadas para enviar lembretes de vacinas, remédios e consultas. Nenhuma informação é enviada para terceiros.
- **Armazenamento**: usado para salvar e exportar documentos em PDF dentro do próprio dispositivo.

**3. Compartilhamento de dados**
O PetCare não compartilha nenhum dado com terceiros, não utiliza serviços de análise, publicidade ou rastreamento.

**4. Backup**
A função de backup exporta os dados em um arquivo JSON salvo localmente ou compartilhado via apps do próprio dispositivo (e-mail, Drive, etc.). O desenvolvedor não tem acesso a esse arquivo.

**5. Exclusão de dados**
Para excluir todos os dados do app, basta desinstalar o aplicativo. Todos os dados locais são removidos automaticamente.

**6. Contato**
Dúvidas sobre privacidade: matheu.proensa@gmail.com

---

## 8. ASSETS NECESSÁRIOS (você precisa criar)

| Asset | Tamanho | Observação |
|---|---|---|
| Ícone do app | 512×512 px PNG | Já existe em `assets/icon.png` — redimensionar |
| Feature Graphic | 1024×500 px PNG/JPG | Banner da ficha da loja — criar no Canva |
| Screenshots (mín. 2) | 1080×1920 px | Prints das telas principais do app |

**Sugestão de screenshots (em ordem):**
1. Dashboard com "Bom dia" e Saúde Hoje
2. PetDetail com grid de ações (Vacinas, Linha da Vida, Memórias...)
3. Linha da Vida com a timeline
4. Tela de Vacinas com cards coloridos
5. Nova Memória (formulário com foto)
6. Tela de Emergência

---

## 9. CHECKLIST ANTES DE PUBLICAR

- [ ] Instalar EAS CLI: `npm install -g eas-cli`
- [ ] Login: `eas login`
- [ ] Vincular projeto: `eas build:configure` (preenche o projectId no app.json)
- [ ] Gerar build de produção: `eas build --platform android --profile production`
- [ ] Criar conta na Play Console (play.google.com/console) — $25 taxa única
- [ ] Hospedar a Política de Privacidade (GitHub Pages, Notion ou Google Sites)
- [ ] Criar Feature Graphic 1024×500 no Canva
- [ ] Tirar screenshots das telas principais
- [ ] Subir o AAB gerado pelo EAS
- [ ] Preencher ficha com os textos acima
- [ ] Responder questionário de classificação indicativa (tudo "Não")
- [ ] Enviar para revisão — prazo médio: 1 a 3 dias úteis
