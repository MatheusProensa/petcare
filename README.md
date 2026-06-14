# PetCare 🐾

App de prontuário de saúde para pets, feito com **Expo / React Native + TypeScript**.
Centraliza vacinas, consultas, medicamentos, peso, documentos e contatos de emergência de
todos os seus pets em um só lugar — com lembretes, backup e modo offline (tudo guardado no
dispositivo).

## Funcionalidades

- **Onboarding** inicial explicando os principais recursos do app.
- **Dashboard**: saudação dinâmica, resumo (pets, alertas, remédios ativos), acesso rápido
  para cadastrar pet / novo registro, alertas prioritários, próximos eventos e últimos
  registros de todos os pets.
- **Prontuário por pet**: linha do tempo agrupada por mês, com filtros por tipo (vacinas,
  consultas, remédios, vermífugos, peso, documentos, observações) e indicadores de status
  (atrasado, próximo, concluído, em dia).
- **Vacinas**: carteira de vacinação com status (em dia, reforço próximo, atrasada,
  reforço aplicado).
- **Medicamentos**: controle de doses, marcação de "dose tomada", barra de progresso do
  tratamento, badge contínuo/temporário e alerta de fim de tratamento.
- **Peso**: histórico e gráfico de evolução.
- **Documentos**: exames, receitas e carteiras de vacinação digitalizados, com visualização
  integrada.
- **Emergência**: dados do pet, do tutor e contatos importantes sempre à mão.
- **Busca** global por registros.
- **Backup**: exportar/importar backup em JSON, com resumo de conteúdo antes de restaurar e
  data do último backup.
- **Modo demonstração**: carrega pets e histórico fictícios para explorar o app rapidamente.
- **Temas** claro e escuro, com identidade visual própria da marca PetCare.

## Stack

- [Expo](https://expo.dev) + React Native
- TypeScript
- React Navigation (native-stack)
- AsyncStorage para persistência local (veja [docs/SQLITE_MIGRATION.md](docs/SQLITE_MIGRATION.md)
  para o plano de migração para SQLite)

## Como rodar

```bash
npm install
npx expo start
```

Abra no Expo Go (Android/iOS) escaneando o QR code, ou pressione `w` para abrir no navegador.

## Modo demonstração

Na tela **Sobre**, use o botão "Carregar dados de demonstração" para preencher o app com
pets fictícios e histórico de exemplo (substitui os dados atuais — peça confirmação antes).

## Screenshots

_Pendente: capturas de tela do app em uso. Veja [docs/screenshots](docs/screenshots)._

## Melhorias futuras

- Migração de AsyncStorage para SQLite (plano completo em
  [docs/SQLITE_MIGRATION.md](docs/SQLITE_MIGRATION.md)).
- Sincronização em nuvem / backup automático.
- Suporte a múltiplos tutores por pet.
- Notificações push remotas (hoje as notificações são locais).
