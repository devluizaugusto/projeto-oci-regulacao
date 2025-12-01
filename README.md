# Instrumento de Monitoramento e Avaliação - OCI Oftalmologia

Sistema de monitoramento e avaliação para OCI (Oftalmologia) da Secretaria Municipal de Saúde - Central de Regulação.

## Funcionalidades

- ✅ **Cadastro de Pacientes**: Dados completos do paciente (nome, CPF, telefone, data de nascimento, etc.)
- ✅ **Integração com Google Sheets**: Sincronização automática com planilha do Google Sheets
- ✅ **Sincronização em Tempo Real**: Atualização automática conforme a planilha é preenchida
- ✅ **Motivo/Subgrupo de OCI**: Seleção do motivo com estatísticas comparativas
- ✅ **Data da Consulta**: Registro e acompanhamento de datas
- ✅ **Validação com Checkboxes**: 
  - Comparecimento
  - Exames realizados
  - Status atual da OCI
- ✅ **Indicador Visual de Prazo**: Escala de cores (verde/amarelo/vermelho) baseada na data de conclusão
- ✅ **Estatísticas de Status**: Quantidade de OCI's em cada status
- ✅ **Estatísticas Mensais**: Consultas por mês e OCI's a concluir

## Tecnologias

- React 18
- TypeScript
- Vite
- Recharts (gráficos)
- date-fns (manipulação de datas)
- LocalStorage (armazenamento local)

## Instalação

```bash
npm install
```

## Executar em Desenvolvimento

```bash
npm run dev
```

## Build para Produção

```bash
npm run build
```

## Estrutura do Projeto

```
src/
  ├── components/           # Componentes React
  │   ├── PacienteCard.tsx
  │   ├── Dashboard.tsx
  │   └── GoogleSheetsConfig.tsx
  ├── types/                # Definições TypeScript
  │   └── index.ts
  ├── utils/                # Funções utilitárias
  │   ├── storage.ts        # Armazenamento local
  │   ├── calculos.ts       # Cálculos estatísticos
  │   └── googleSheets.ts   # Integração com Google Sheets
  ├── App.tsx               # Componente principal
  ├── App.css               # Estilos
  └── main.tsx             # Ponto de entrada
```

## Integração com Google Sheets

### Como Funciona

A aplicação se conecta ao Google Sheets através da API pública do Google. Os dados são sincronizados automaticamente em intervalos configuráveis.

### Configuração da Planilha

1. **Tornar a Planilha Pública** (recomendado):
   - No Google Sheets, clique em "Compartilhar"
   - Selecione "Qualquer pessoa com o link pode visualizar"
   - Copie a URL e cole na configuração da aplicação

2. **Usar API Key** (para planilhas privadas):
   - Crie uma API Key no [Google Cloud Console](https://console.cloud.google.com/)
   - Habilite a API do Google Sheets
   - Adicione a API Key na configuração da aplicação

### Mapeamento de Colunas

A aplicação espera que a planilha tenha a seguinte estrutura:

| Coluna | Campo | Exemplo |
|--------|-------|---------|
| A | NOME DO PACIENTE | João Silva |
| B | DATA DE NASCIMENTO | 15/03/1980 |
| C | IDADE | 44 |
| D | NOME DA MÃE | Maria Silva |
| E | CPF | 12345678900 |
| F | TELEFONE | 81987654321 |
| G | SUBGRUPO DE OCI | Avaliação de retinopatia diabética |
| H | DATA DA CONSULTA | 01/12/2024 |

**Nota**: A primeira linha deve conter os cabeçalhos e os dados começam na linha 3.

## Uso

### Configuração Inicial

1. **Configurar Sincronização com Google Sheets**:
   - Clique no botão "⚙️ Configurar Sincronização" na barra de navegação
   - Cole a URL da sua planilha do Google Sheets
   - Informe o nome da aba (ex: LIMOEIRO, BOM JARDIM, etc.)
   - Configure o intervalo de sincronização (padrão: 30 segundos)
   - Para planilhas privadas, adicione uma API Key do Google

2. **Estrutura da Planilha**:
   - A planilha deve ter as seguintes colunas (a partir da linha 3):
     - Coluna A: NOME DO PACIENTE
     - Coluna B: DATA DE NASCIMENTO (formato DD/MM/AAAA)
     - Coluna C: IDADE
     - Coluna D: NOME DA MÃE
     - Coluna E: CPF
     - Coluna F: TELEFONE
     - Coluna G: SUBGRUPO DE OCI
     - Coluna H: DATA DA CONSULTA (formato DD/MM/AAAA)

### Funcionalidades

1. **Sincronização Automática**: Os dados são atualizados automaticamente conforme a planilha é preenchida
2. **Sincronização Manual**: Clique no botão "🔄 Sincronizar" para atualizar imediatamente
3. **Cadastro de Pacientes**: Os pacientes são criados automaticamente quando adicionados na planilha do Google Sheets
4. **Validação**: Use os checkboxes no card para marcar comparecimento e exames realizados
5. **Status da OCI**: Altere o status da OCI diretamente no card do paciente (validações são preservadas mesmo após sincronização)
6. **Visualizar Estatísticas**: Acesse a aba "Dashboard" para ver gráficos e estatísticas
7. **Acompanhar Prazos**: O indicador de cor mostra o status do prazo de conclusão

**Importante**: Os pacientes são criados e atualizados apenas através da sincronização com o Google Sheets. Não é possível criar pacientes manualmente no site.

## Indicadores de Prazo

- 🟢 **Verde**: Mais de 7 dias restantes
- 🟡 **Amarelo**: 7 dias ou menos restantes
- 🔴 **Vermelho**: Prazo vencido

## Status das OCI's

- Pendente
- Em andamento
- Aguardando exames
- Concluída
- Cancelada

