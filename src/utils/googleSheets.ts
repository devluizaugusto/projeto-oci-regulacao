import { Paciente, SubgrupoOCI, StatusOCI } from '../types';
import { parse, addDays, format } from 'date-fns';
import { formatarDataBR } from './masks';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName?: string;
  apiKey?: string;
  range?: string;
}

/**
 * Converte uma linha da planilha do Google Sheets para um objeto Paciente
 */
const linhaParaPaciente = (linha: any[], index: number): Paciente | null => {
  try {
    // Mapeamento das colunas baseado na estrutura da planilha
    // Coluna A: NOME DO PACIENTE
    // Coluna B: DATA DE NASCIMENTO
    // Coluna C: IDADE
    // Coluna D: NOME DA MÃE
    // Coluna E: CPF
    // Coluna F: TELEFONE
    // Coluna G: SUBGRUPO DE OCI
    // Coluna H: DATA DA CONSULTA (ou DATA DA COM ES)
    // Coluna I: COMPARECIMENTO (SIM/NÃO ou TRUE/FALSE ou 1/0)
    // Coluna J: EXAMES REALIZADOS (SIM/NÃO ou TRUE/FALSE ou 1/0)
    // Coluna K: STATUS ATUAL (Pendente, Em andamento, Aguardando exames, Concluída, Cancelada)
    
    const nome = linha[0]?.toString().trim() || '';
    const dataNascimento = linha[1]?.toString().trim() || '';
    const idadeStr = linha[2]?.toString().trim() || '0';
    const nomeMae = linha[3]?.toString().trim() || '';
    const cpf = linha[4]?.toString().trim() || '';
    const telefone = linha[5]?.toString().trim() || '';
    const subgrupoOCI = linha[6]?.toString().trim() || 'Outros';
    const dataConsulta = linha[7]?.toString().trim() || '';
    const comparecimentoStr = linha[8]?.toString().trim().toLowerCase() || '';
    const examesRealizadosStr = linha[9]?.toString().trim().toLowerCase() || '';
    const statusAtualStr = linha[10]?.toString().trim() || 'Pendente';

    // Validação básica - precisa ter pelo menos nome
    // Verificar se não é cabeçalho ou linha vazia
    const nomeLower = nome.toLowerCase().trim();
    if (!nome || 
        nome.trim().length === 0 ||
        nomeLower === 'nome do paciente' ||
        nomeLower === 'nome' ||
        nomeLower.startsWith('secretaria') ||
        nomeLower.startsWith('prefeitura')) {
      return null;
    }

    const idade = parseInt(idadeStr) || 0;

    // Calcular prazo de conclusão (30 dias após a consulta por padrão)
    let prazoConclusao = '';
    if (dataConsulta) {
      try {
        // Tenta parsear no formato DD/MM/AAAA
        const data = parse(dataConsulta, 'dd/MM/yyyy', new Date());
        if (!isNaN(data.getTime())) {
          prazoConclusao = format(addDays(data, 30), 'dd/MM/yyyy');
        } else {
          // Se falhar, tenta parsear como data ISO
          const dataISO = new Date(dataConsulta);
          if (!isNaN(dataISO.getTime())) {
            prazoConclusao = format(addDays(dataISO, 30), 'dd/MM/yyyy');
          } else {
            prazoConclusao = format(addDays(new Date(), 30), 'dd/MM/yyyy');
          }
        }
      } catch {
        prazoConclusao = format(addDays(new Date(), 30), 'dd/MM/yyyy');
      }
    } else {
      prazoConclusao = format(addDays(new Date(), 30), 'dd/MM/yyyy');
    }
    
    // Garantir que dataConsulta está no formato brasileiro
    const dataConsultaFormatada = dataConsulta ? formatarDataBR(dataConsulta) : format(new Date(), 'dd/MM/yyyy');
    const dataNascimentoFormatada = dataNascimento ? formatarDataBR(dataNascimento) : '';

    // Normalizar subgrupo OCI
    const subgrupoNormalizado = normalizarSubgrupo(subgrupoOCI);

    // Criar ID único baseado em múltiplos campos para garantir unicidade
    // Usa CPF + nome + dataNascimento + índice da linha para garantir que seja único
    // O índice da linha é crítico para diferenciar pacientes mesmo com dados similares
    const nomeNormalizado = nome.replace(/\s+/g, '-').toLowerCase().substring(0, 30);
    const dataNascNormalizada = (dataNascimentoFormatada || '').replace(/\//g, '-');
    
    // Criar ID único: combinação de CPF (se existir), nome, data nascimento e índice da linha
    let idBase = '';
    if (cpf && cpf.length > 0) {
      // Se tem CPF, usar CPF + nome + data nascimento + índice
      idBase = `${cpf}-${nomeNormalizado}-${dataNascNormalizada}-${index}`;
    } else {
      // Se não tem CPF, usar nome + data nascimento + telefone + índice
      const telefoneNormalizado = telefone.replace(/\D/g, '').substring(0, 11);
      idBase = `paciente-${nomeNormalizado}-${dataNascNormalizada}-${telefoneNormalizado}-${index}`;
    }
    
    // Limpar e normalizar o ID
    const id = idBase
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .substring(0, 100); // Limitar tamanho

    // Converter comparecimento e exames realizados
    const comparecimento = comparecimentoStr === 'sim' || comparecimentoStr === 'true' || comparecimentoStr === '1' || comparecimentoStr === 'x' || comparecimentoStr === '✓';
    const examesRealizados = examesRealizadosStr === 'sim' || examesRealizadosStr === 'true' || examesRealizadosStr === '1' || examesRealizadosStr === 'x' || examesRealizadosStr === '✓';

    // Normalizar status
    const statusNormalizado = normalizarStatus(statusAtualStr);

    return {
      id,
      nome,
      dataNascimento: dataNascimentoFormatada || format(new Date(), 'dd/MM/yyyy'),
      idade,
      nomeMae,
      cpf,
      telefone,
      subgrupoOCI: subgrupoNormalizado,
      dataConsulta: dataConsultaFormatada,
      prazoConclusao,
      validacao: {
        comparecimento,
        examesRealizados,
        statusAtual: statusNormalizado,
      },
    };
  } catch (error) {
    console.error('Erro ao converter linha para paciente:', error, linha);
    return null;
  }
};

/**
 * Normaliza o status OCI para um dos valores válidos
 */
const normalizarStatus = (status: string): StatusOCI => {
  const statusLower = status.toLowerCase();
  
  if (statusLower.includes('pendente')) return 'Pendente';
  if (statusLower.includes('andamento') || statusLower.includes('em andamento')) return 'Em andamento';
  if (statusLower.includes('aguardando') || statusLower.includes('exames')) return 'Aguardando exames';
  if (statusLower.includes('concluída') || statusLower.includes('concluida')) return 'Concluída';
  if (statusLower.includes('cancelada')) return 'Cancelada';
  
  return 'Pendente';
};

/**
 * Normaliza o subgrupo OCI para um dos valores válidos
 */
const normalizarSubgrupo = (subgrupo: string): SubgrupoOCI => {
  const subgrupoLower = subgrupo.toLowerCase();
  
  if (subgrupoLower.includes('retinopatia') || subgrupoLower.includes('diabética')) {
    return 'Avaliação de retinopatia diabética';
  }
  if (subgrupoLower.includes('glaucoma')) {
    return 'Avaliação de glaucoma';
  }
  if (subgrupoLower.includes('catarata')) {
    return 'Avaliação de catarata';
  }
  if (subgrupoLower.includes('estrabismo')) {
    return 'Avaliação de estrabismo';
  }
  if (subgrupoLower.includes('pterígio') || subgrupoLower.includes('pterigio')) {
    return 'Avaliação de pterígio';
  }
  
  return 'Outros';
};

/**
 * Parse CSV linha considerando vírgulas dentro de aspas
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

/**
 * Busca dados da planilha do Google Sheets usando a API pública
 */
export const buscarDadosGoogleSheets = async (
  config: GoogleSheetsConfig
): Promise<Paciente[]> => {
  try {
    const { spreadsheetId, sheetName = 'LIMOEIRO', range = 'A3:H1000', apiKey } = config;
    
    // Se tiver API Key, tentar usar a API oficial primeiro
    if (apiKey) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${range}?key=${apiKey}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.values && Array.isArray(data.values)) {
            console.log(`Total de linhas da API: ${data.values.length}`);
            const pacientes: Paciente[] = [];
            const idsUsados = new Set<string>();
            
            // Identificar onde começam os dados (pular cabeçalhos)
            let linhaInicial = 0;
            for (let i = 0; i < Math.min(3, data.values.length); i++) {
              const primeiroCampo = data.values[i]?.[0]?.toString().trim().toLowerCase() || '';
              if (primeiroCampo.includes('nome') && primeiroCampo.includes('paciente')) {
                linhaInicial = i + 1;
                break;
              }
            }
            
            const linhasDados = data.values.slice(linhaInicial);
            console.log(`Linhas de dados (após pular ${linhaInicial} cabeçalhos): ${linhasDados.length}`);
            
            linhasDados.forEach((linha: any[], index: number) => {
              // Verificar se a linha tem pelo menos um campo não vazio
              const temDados = linha && linha.some((v: any) => v && v.toString().trim().length > 0);
              if (!temDados) {
                return; // Pular linhas completamente vazias
              }
              
              const paciente = linhaParaPaciente(linha, linhaInicial + index + 1);
              if (paciente) {
                // Verificar se o ID já existe (duplicata)
                if (idsUsados.has(paciente.id)) {
                  console.warn(`ID duplicado detectado: ${paciente.id} para paciente ${paciente.nome}. Adicionando sufixo.`);
                  // Adicionar sufixo único ao ID
                  let novoId = paciente.id;
                  let contador = 1;
                  while (idsUsados.has(novoId)) {
                    novoId = `${paciente.id}-${contador}`;
                    contador++;
                  }
                  paciente.id = novoId;
                }
                idsUsados.add(paciente.id);
                pacientes.push(paciente);
                console.log(`Paciente processado: ${paciente.nome} (ID: ${paciente.id})`);
              } else {
                console.log(`Linha ${linhaInicial + index + 1} ignorada (sem nome válido):`, linha[0]);
              }
            });
            
            console.log(`Total de pacientes processados: ${pacientes.length}`);
            
            if (pacientes.length === 0 && linhasDados.length > 0) {
              console.warn('Nenhum paciente foi processado, mas havia linhas de dados. Verifique o formato da planilha.');
            }
            
            return pacientes;
          }
        }
      } catch (apiError) {
        console.warn('Erro ao usar API oficial, tentando método alternativo:', apiError);
      }
    }
    
    // Método alternativo: usar exportação CSV pública (funciona melhor para planilhas públicas)
    // Remover o range do sheetName se estiver presente
    const sheetNameClean = sheetName.split('!')[0];
    // Aumentar o range para incluir as colunas I, J, K (comparecimento, exames, status)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetNameClean)}`;
    
    const csvResponse = await fetch(csvUrl);
    
    if (!csvResponse.ok) {
      throw new Error(
        `Erro ao buscar dados (${csvResponse.status}): ${csvResponse.statusText}. ` +
        `Certifique-se de que a planilha está pública (compartilhada como "Qualquer pessoa com o link pode visualizar") ` +
        `ou forneça uma API Key válida.`
      );
    }
    
    const csvText = await csvResponse.text();
    const linhas = csvText.split('\n').filter(linha => linha.trim());
    
    console.log(`Total de linhas no CSV: ${linhas.length}`);
    
    // Processar todas as linhas, identificando cabeçalhos automaticamente
    const pacientes: Paciente[] = [];
    const idsUsados = new Set<string>();
    let linhaInicial = 0;
    
    // Identificar onde começam os dados (pular cabeçalhos)
    for (let i = 0; i < Math.min(3, linhas.length); i++) {
      const valores = parseCSVLine(linhas[i]);
      const primeiroCampo = valores[0]?.toString().trim().toLowerCase() || '';
      // Se encontrar "nome" no primeiro campo, é cabeçalho
      if (primeiroCampo.includes('nome') && primeiroCampo.includes('paciente')) {
        linhaInicial = i + 1;
        break;
      }
    }
    
    const linhasDados = linhas.slice(linhaInicial);
    console.log(`Linhas de dados (após pular ${linhaInicial} cabeçalhos): ${linhasDados.length}`);
    
    linhasDados.forEach((linha, index) => {
      const valores = parseCSVLine(linha);
      
      // Verificar se a linha tem pelo menos um campo não vazio
      const temDados = valores.some(v => v && v.toString().trim().length > 0);
      if (!temDados) {
        return; // Pular linhas completamente vazias
      }
      
      const paciente = linhaParaPaciente(valores, linhaInicial + index + 1);
      if (paciente) {
        // Verificar se o ID já existe (duplicata)
        if (idsUsados.has(paciente.id)) {
          console.warn(`ID duplicado detectado: ${paciente.id} para paciente ${paciente.nome}. Adicionando sufixo.`);
          // Adicionar sufixo único ao ID
          let novoId = paciente.id;
          let contador = 1;
          while (idsUsados.has(novoId)) {
            novoId = `${paciente.id}-${contador}`;
            contador++;
          }
          paciente.id = novoId;
        }
        idsUsados.add(paciente.id);
        pacientes.push(paciente);
        console.log(`Paciente processado: ${paciente.nome} (ID: ${paciente.id})`);
      } else {
        console.log(`Linha ${linhaInicial + index + 1} ignorada (sem nome válido):`, valores[0]);
      }
    });
    
    console.log(`Total de pacientes processados: ${pacientes.length}`);
    
    if (pacientes.length === 0 && linhasDados.length > 0) {
      console.warn('Nenhum paciente foi processado, mas havia linhas de dados. Verifique o formato da planilha.');
    }
    
    return pacientes;
  } catch (error: any) {
    console.error('Erro ao buscar dados do Google Sheets:', error);
    
    if (error.message) {
      throw error;
    }
    
    throw new Error(
      `Erro ao conectar com Google Sheets: ${error.message || 'Erro desconhecido'}. ` +
      `Verifique se a planilha está pública ou se a API Key está correta.`
    );
  }
};

/**
 * Extrai o ID da planilha de uma URL do Google Sheets
 */
export const extrairIdPlanilha = (url: string): string | null => {
  try {
    // Formato: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

