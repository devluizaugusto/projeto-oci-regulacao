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
 * Detecta os índices das colunas baseado nos cabeçalhos
 */
const detectarIndicesColunas = (cabecalhos: any[]): { [key: string]: number } => {
  const indices: { [key: string]: number } = {
    nome: 0,
    dataNascimento: 1,
    idade: 2,
    nomeMae: 3,
    cpf: 4,
    telefone: 5,
    subgrupoOCI: 6,
    dataConsulta: 7,
    comparecimento: 8,
    examesRealizados: 11, // Coluna L
    statusAtual: 12 // Coluna M
  };
  
  // Procurar pelos cabeçalhos
  cabecalhos.forEach((cabecalho, index) => {
    if (!cabecalho) return;
    const cabecalhoLower = cabecalho.toString().toLowerCase().trim();
    
    // Detectar "Exames Realizados" - deve conter "exames" e "realizados" (prioridade alta)
    if (cabecalhoLower.includes('exames') && cabecalhoLower.includes('realizados')) {
      indices.examesRealizados = index;
      console.log(`[DEBUG] Detectado "Exames Realizados" na coluna ${index} (${String.fromCharCode(65 + index)})`);
    // Detectar "Status" - deve conter "status" mas NÃO "exames" (prioridade alta)
    } else if (cabecalhoLower.includes('status') && !cabecalhoLower.includes('exames')) {
      // Priorizar "status atual"
      if (cabecalhoLower.includes('atual')) {
        indices.statusAtual = index;
        console.log(`[DEBUG] Detectado "Status Atual" na coluna ${index} (${String.fromCharCode(65 + index)})`);
      } else if (indices.statusAtual === 12) {
        // Se ainda não foi detectado e o padrão é 12, usar este
        indices.statusAtual = index;
        console.log(`[DEBUG] Detectado "Status" na coluna ${index} (${String.fromCharCode(65 + index)})`);
      }
    } else if (cabecalhoLower.includes('comparecimento')) {
      indices.comparecimento = index;
    } else if (cabecalhoLower.includes('data') && cabecalhoLower.includes('consulta')) {
      indices.dataConsulta = index;
    } else if (cabecalhoLower.includes('subgrupo') || cabecalhoLower.includes('oci')) {
      indices.subgrupoOCI = index;
    } else if (cabecalhoLower.includes('telefone')) {
      indices.telefone = index;
    } else if (cabecalhoLower.includes('cpf')) {
      indices.cpf = index;
    } else if (cabecalhoLower.includes('mãe') || cabecalhoLower.includes('mae')) {
      indices.nomeMae = index;
    } else if (cabecalhoLower.includes('idade')) {
      indices.idade = index;
    } else if (cabecalhoLower.includes('nascimento')) {
      indices.dataNascimento = index;
    } else if (cabecalhoLower.includes('nome') && cabecalhoLower.includes('paciente')) {
      indices.nome = index;
    }
  });
  
  console.log('[DEBUG] Índices das colunas detectados:', indices);
  return indices;
};

/**
 * Converte uma linha da planilha do Google Sheets para um objeto Paciente
 */
const linhaParaPaciente = (linha: any[], index: number, indicesColunas?: { [key: string]: number }): Paciente | null => {
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
    // Coluna J: (pode ter outras informações)
    // Coluna K: (pode ter outras informações)
    // Coluna L: EXAMES REALIZADOS (SIM/NÃO ou TRUE/FALSE ou 1/0)
    // Coluna M: STATUS ATUAL (Pendente, Em andamento, Aguardando exames, Concluída, Cancelada)
    
    // Usar índices detectados ou padrão
    const idx = indicesColunas || {
      nome: 0, dataNascimento: 1, idade: 2, nomeMae: 3, cpf: 4,
      telefone: 5, subgrupoOCI: 6, dataConsulta: 7,
      comparecimento: 8, examesRealizados: 11, statusAtual: 12 // L=11, M=12
    };
    
    const nome = linha[idx.nome]?.toString().trim() || '';
    const dataNascimento = linha[idx.dataNascimento]?.toString().trim() || '';
    const idadeStr = linha[idx.idade]?.toString().trim() || '0';
    const nomeMae = linha[idx.nomeMae]?.toString().trim() || '';
    const cpf = linha[idx.cpf]?.toString().trim() || '';
    const telefone = linha[idx.telefone]?.toString().trim() || '';
    // Ler subgrupo OCI - garantir que está lendo da coluna correta
    // Verificar se o valor no índice detectado parece ser uma data (não é subgrupo)
    let subgrupoOCI = '';
    const valorNoIndice = linha[idx.subgrupoOCI]?.toString().trim() || '';
    
    // Verificar se o valor parece ser uma data (formato DD/MM/YYYY)
    const pareceData = /^\d{2}\/\d{2}\/\d{4}$/.test(valorNoIndice);
    
    if (idx.subgrupoOCI !== undefined && linha[idx.subgrupoOCI] !== undefined && !pareceData) {
      subgrupoOCI = valorNoIndice;
    }
    
    // Se o valor no índice detectado é uma data, procurar em outras colunas
    if (pareceData || !subgrupoOCI) {
      console.warn(`[WARN] Valor no índice ${idx.subgrupoOCI} parece ser uma data ("${valorNoIndice}"). Procurando subgrupo em outras colunas...`);
      
      // Procurar em todas as colunas por um valor que não seja data e não seja vazio
      for (let i = 0; i < linha.length; i++) {
        const valor = linha[i]?.toString().trim() || '';
        if (valor && !/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
          // Verificar se parece ser um subgrupo OCI (contém palavras-chave)
          const valorLower = valor.toLowerCase();
          if (valorLower.includes('retinopatia') || 
              valorLower.includes('glaucoma') || 
              valorLower.includes('catarata') || 
              valorLower.includes('estrabismo') || 
              valorLower.includes('pterigio') || 
              valorLower.includes('pterígio') ||
              valorLower.includes('avaliacao') ||
              valorLower === 'outros') {
            subgrupoOCI = valor;
            console.log(`[DEBUG] Subgrupo OCI encontrado na coluna ${i} (${String.fromCharCode(65 + i)}): "${valor}"`);
            break;
          }
        }
      }
    }
    
    // Fallback final: tentar ler diretamente do índice 6 (coluna G) se ainda não encontrou
    if (!subgrupoOCI && linha[6] !== undefined) {
      const valorColunaG = linha[6]?.toString().trim() || '';
      if (valorColunaG && !/^\d{2}\/\d{2}\/\d{4}$/.test(valorColunaG)) {
        subgrupoOCI = valorColunaG;
        console.log(`[DEBUG] Usando fallback: Subgrupo OCI lido do índice 6 (coluna G) = "${subgrupoOCI}"`);
      }
    }
    
    // Log para debug do subgrupo
    if (nome) {
      console.log(`[DEBUG] Paciente ${nome}:`, {
        'Índice Subgrupo OCI detectado': idx.subgrupoOCI,
        'Valor no índice detectado': valorNoIndice,
        'Parece ser data?': pareceData,
        'Valor na coluna G (índice 6)': linha[6],
        'Subgrupo OCI final': subgrupoOCI,
        'Tamanho do array': linha.length,
        'Array completo': linha
      });
    }
    const dataConsulta = linha[idx.dataConsulta]?.toString().trim() || '';
    
    // Ler das colunas detectadas - exatamente como está na planilha
    let comparecimentoOriginal = linha[idx.comparecimento]?.toString().trim() || '';
    
    // Garantir que estamos lendo da coluna L (índice 11) para Exames Realizados
    let examesRealizadosOriginal = '';
    if (idx.examesRealizados !== undefined && linha[idx.examesRealizados] !== undefined) {
      examesRealizadosOriginal = linha[idx.examesRealizados]?.toString().trim() || '';
    }
    // Fallback: tentar ler diretamente do índice 11 (coluna L)
    if (!examesRealizadosOriginal && linha[11] !== undefined) {
      examesRealizadosOriginal = linha[11]?.toString().trim() || '';
      console.log(`[DEBUG] Usando fallback: Exames Realizados lido do índice 11 (coluna L)`);
    }
    
    // Garantir que estamos lendo da coluna M (índice 12) para Status Atual
    let statusAtualOriginal = '';
    if (idx.statusAtual !== undefined && linha[idx.statusAtual] !== undefined) {
      statusAtualOriginal = linha[idx.statusAtual]?.toString().trim() || '';
    }
    // Fallback: tentar ler diretamente do índice 12 (coluna M)
    if (!statusAtualOriginal && linha[12] !== undefined) {
      statusAtualOriginal = linha[12]?.toString().trim() || '';
      console.log(`[DEBUG] Usando fallback: Status Atual lido do índice 12 (coluna M)`);
    }
    
    // Se o status estiver vazio na coluna M, procurar em outras colunas
    if (!statusAtualOriginal && linha.length > 12) {
      for (let i = 12; i < linha.length; i++) {
        const valor = linha[i]?.toString().trim() || '';
        if (valor && valor.length > 0) {
          // Verificar se parece ser um status
          const valorLower = valor.toLowerCase();
          if (valorLower.includes('pendente') || 
              valorLower.includes('andamento') || 
              valorLower.includes('aguardando') || 
              valorLower.includes('exames') ||
              valorLower.includes('exame') ||
              valorLower.includes('concluída') || 
              valorLower.includes('concluida') || 
              valorLower.includes('cancelada')) {
            statusAtualOriginal = valor;
            break;
          }
        }
      }
    }
    
    // Se ainda não encontrou, verificar todas as colunas procurando por "STATUS" no cabeçalho
    // (isso seria feito em outra parte do código que processa cabeçalhos)
    
    // Converter para lowercase apenas para comparação
    const comparecimentoStr = comparecimentoOriginal.toLowerCase();
    const examesRealizadosStr = examesRealizadosOriginal.toLowerCase();
    const statusAtualStr = statusAtualOriginal; // Manter original para normalização
    
    // Log para debug
    if (nome) {
      console.log(`[DEBUG] Paciente ${nome}:`, {
        'Índice Exames Realizados': idx.examesRealizados,
        'Índice Status Atual': idx.statusAtual,
        'Valor coluna L (índice 11)': linha[11],
        'Valor coluna M (índice 12)': linha[12],
        'Comparecimento': comparecimentoOriginal,
        'Exames Realizados (lido)': examesRealizadosOriginal,
        'Status Atual (lido)': statusAtualOriginal,
        'Tamanho do array': linha.length,
        'Array completo': linha,
        'Índices usados': idx
      });
    }
    
    // Se o status ainda estiver vazio, tentar ler de todas as colunas possíveis
    if (!statusAtualOriginal && nome) {
      console.warn(`[WARN] Status vazio para paciente ${nome}. Procurando em todas as colunas...`);
      for (let i = 0; i < linha.length; i++) {
        const valor = linha[i]?.toString().trim() || '';
        if (valor) {
          const valorLower = valor.toLowerCase();
          if (valorLower.includes('pendente') || 
              valorLower.includes('andamento') || 
              valorLower.includes('aguardando') || 
              valorLower.includes('exames') ||
              valorLower.includes('exame') ||
              valorLower.includes('concluída') || 
              valorLower.includes('concluida') || 
              valorLower.includes('cancelada')) {
            console.log(`[INFO] Status encontrado na coluna ${i}: "${valor}"`);
            statusAtualOriginal = valor;
            break;
          }
        }
      }
    }

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

    // Normalizar subgrupo OCI - mas primeiro verificar se já é válido
    let subgrupoNormalizado: SubgrupoOCI = 'Outros'; // Valor padrão
    
    // Se o valor original já é um dos valores válidos, manter
    const valoresValidos: SubgrupoOCI[] = [
      'Avaliação de retinopatia diabética',
      'Avaliação de glaucoma',
      'Avaliação de catarata',
      'Avaliação de estrabismo',
      'Avaliação de pterígio',
      'Outros'
    ];
    
    if (subgrupoOCI && subgrupoOCI.trim().length > 0) {
      const subgrupoLower = subgrupoOCI.toLowerCase().trim();
      let encontrado = false;
      
      for (const valorValido of valoresValidos) {
        if (subgrupoLower === valorValido.toLowerCase().trim()) {
          subgrupoNormalizado = valorValido;
          encontrado = true;
          console.log(`[DEBUG] Subgrupo já é válido, mantendo: "${valorValido}"`);
          break;
        }
      }
      
      // Se não encontrou, normalizar
      if (!encontrado) {
        subgrupoNormalizado = normalizarSubgrupo(subgrupoOCI);
      }
    } else {
      console.warn(`[WARN] Subgrupo vazio para paciente ${nome}, usando "Outros"`);
    }
    
    // Log final do subgrupo
    if (nome) {
      console.log(`[DEBUG FINAL Subgrupo] Paciente ${nome}:`, {
        'Subgrupo Original da Planilha': subgrupoOCI,
        'Subgrupo Normalizado Final': subgrupoNormalizado
      });
    }

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
    // Aceita várias variações: SIM, Sim, sim, TRUE, true, 1, X, ✓, S, etc.
    const comparecimento = comparecimentoStr === 'sim' || 
                           comparecimentoStr === 's' || 
                           comparecimentoStr === 'true' || 
                           comparecimentoStr === '1' || 
                           comparecimentoStr === 'x' || 
                           comparecimentoStr === '✓' ||
                           comparecimentoStr === 'yes' ||
                           comparecimentoStr === 'y';
    
    const examesRealizados = examesRealizadosStr === 'sim' || 
                             examesRealizadosStr === 's' || 
                             examesRealizadosStr === 'true' || 
                             examesRealizadosStr === '1' || 
                             examesRealizadosStr === 'x' || 
                             examesRealizadosStr === '✓' ||
                             examesRealizadosStr === 'yes' ||
                             examesRealizadosStr === 'y';

    // Normalizar status
    const statusNormalizado = normalizarStatus(statusAtualStr);
    
    // Log final para debug
    if (nome) {
      console.log(`[DEBUG FINAL] Paciente ${nome}:`, {
        'Status Original da Planilha': statusAtualOriginal,
        'Status Normalizado': statusNormalizado,
        'Comparecimento': comparecimento,
        'Exames Realizados': examesRealizados
      });
      
      if (!statusNormalizado || statusNormalizado === 'Pendente' && statusAtualOriginal) {
        console.warn(`[WARN] Status pode não ter sido normalizado corretamente. Original: "${statusAtualOriginal}", Normalizado: "${statusNormalizado}"`);
      }
    }

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
 * Tenta manter o texto original quando possível, mas garante que seja um StatusOCI válido
 */
const normalizarStatus = (status: string): StatusOCI => {
  if (!status || typeof status !== 'string' || status.trim().length === 0) {
    console.warn('[WARN] Status vazio ou inválido na planilha. Usando "Pendente" como padrão.');
    return 'Pendente';
  }
  
  const statusTrimmed = status.trim();
  const statusLower = statusTrimmed.toLowerCase();
  
  console.log(`[DEBUG normalizarStatus] Normalizando: "${statusTrimmed}" (lowercase: "${statusLower}")`);
  
  // Verificar correspondências exatas primeiro (case-insensitive)
  if (statusLower === 'aguardando exames' || statusLower === 'aguardando exame') {
    console.log(`[DEBUG normalizarStatus] Retornando: "Aguardando exames"`);
    return 'Aguardando exames';
  }
  if (statusLower === 'pendente') {
    return 'Pendente';
  }
  if (statusLower === 'em andamento' || statusLower === 'andamento') {
    return 'Em andamento';
  }
  if (statusLower === 'concluída' || statusLower === 'concluida') {
    return 'Concluída';
  }
  if (statusLower === 'cancelada') {
    return 'Cancelada';
  }
  
  // Verificar por palavras-chave (mais flexível)
  if (statusLower.includes('aguardando') && (statusLower.includes('exames') || statusLower.includes('exame'))) {
    console.log(`[DEBUG normalizarStatus] Retornando: "Aguardando exames" (por palavras-chave: aguardando + exames)`);
    return 'Aguardando exames';
  }
  if (statusLower.includes('pendente')) {
    return 'Pendente';
  }
  if (statusLower.includes('andamento')) {
    return 'Em andamento';
  }
  if (statusLower.includes('concluída') || statusLower.includes('concluida')) {
    return 'Concluída';
  }
  if (statusLower.includes('cancelada')) {
    return 'Cancelada';
  }
  
  // Se contém apenas "exames" ou "exame", assume "Aguardando exames"
  if (statusLower.includes('exames') || statusLower.includes('exame')) {
    console.log(`[DEBUG normalizarStatus] Retornando: "Aguardando exames" (contém "exames" ou "exame")`);
    return 'Aguardando exames';
  }
  
  // Se não encontrou correspondência, retorna Pendente mas avisa
  console.warn(`[WARN] Status não reconhecido: "${statusTrimmed}". Usando "Pendente" como padrão.`);
  return 'Pendente';
};

/**
 * Normaliza o subgrupo OCI para um dos valores válidos
 * Tenta manter o valor original quando possível
 */
const normalizarSubgrupo = (subgrupo: string): SubgrupoOCI => {
  if (!subgrupo || subgrupo.trim().length === 0) {
    console.warn('[WARN] Subgrupo vazio. Usando "Outros" como padrão.');
    return 'Outros';
  }
  
  const subgrupoTrimmed = subgrupo.trim();
  const subgrupoLower = subgrupoTrimmed.toLowerCase();
  
  console.log(`[DEBUG normalizarSubgrupo] INPUT: "${subgrupoTrimmed}"`);
  
  // Função para normalizar para comparação (remove acentos e espaços extras)
  const normalizarParaComparacao = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  // Lista de valores válidos
  const valoresValidos: SubgrupoOCI[] = [
    'Avaliação de retinopatia diabética',
    'Avaliação de glaucoma',
    'Avaliação de catarata',
    'Avaliação de estrabismo',
    'Avaliação de pterígio',
    'Outros'
  ];
  
  // Primeiro, verificar se o valor já é exatamente um dos valores válidos (case-insensitive)
  for (const valorValido of valoresValidos) {
    const valorValidoLower = valorValido.toLowerCase().trim();
    if (subgrupoLower === valorValidoLower) {
      console.log(`[DEBUG normalizarSubgrupo] MATCH EXATO: "${valorValido}"`);
      return valorValido;
    }
  }
  
  // Verificar também com normalização de acentos
  const subgrupoSemAcentos = normalizarParaComparacao(subgrupoTrimmed);
  console.log(`[DEBUG normalizarSubgrupo] Sem acentos: "${subgrupoSemAcentos}"`);
  
  for (const valorValido of valoresValidos) {
    const valorValidoSemAcentos = normalizarParaComparacao(valorValido);
    if (subgrupoSemAcentos === valorValidoSemAcentos) {
      console.log(`[DEBUG normalizarSubgrupo] MATCH SEM ACENTOS: "${valorValido}"`);
      return valorValido;
    }
  }
  
  // Verificar correspondências exatas (sem acentos)
  if (subgrupoSemAcentos === 'avaliacao de retinopatia diabetica' || 
      subgrupoSemAcentos === 'retinopatia diabetica') {
    console.log(`[DEBUG normalizarSubgrupo] MATCH RETINOPATIA EXATO: "Avaliação de retinopatia diabética"`);
    return 'Avaliação de retinopatia diabética';
  }
  
  // Verificar se contém "retinopatia" E "diabetica" (mais flexível)
  if (subgrupoSemAcentos.includes('retinopatia') && subgrupoSemAcentos.includes('diabetica')) {
    console.log(`[DEBUG normalizarSubgrupo] MATCH RETINOPATIA POR PALAVRAS: "Avaliação de retinopatia diabética"`);
    return 'Avaliação de retinopatia diabética';
  }
  
  if (subgrupoSemAcentos === 'avaliacao de glaucoma' || 
      subgrupoSemAcentos === 'glaucoma') {
    return 'Avaliação de glaucoma';
  }
  if (subgrupoSemAcentos === 'avaliacao de catarata' || 
      subgrupoSemAcentos === 'catarata') {
    return 'Avaliação de catarata';
  }
  if (subgrupoSemAcentos === 'avaliacao de estrabismo' || 
      subgrupoSemAcentos === 'estrabismo') {
    return 'Avaliação de estrabismo';
  }
  if (subgrupoSemAcentos === 'avaliacao de pterigio' || 
      subgrupoSemAcentos === 'pterigio') {
    return 'Avaliação de pterígio';
  }
  if (subgrupoSemAcentos === 'outros') {
    return 'Outros';
  }
  
  // Verificar por palavras-chave individuais (mais flexível ainda)
  if (subgrupoSemAcentos.includes('retinopatia')) {
    console.log(`[DEBUG normalizarSubgrupo] MATCH RETINOPATIA (só palavra): "Avaliação de retinopatia diabética"`);
    return 'Avaliação de retinopatia diabética';
  }
  if (subgrupoSemAcentos.includes('diabetica')) {
    console.log(`[DEBUG normalizarSubgrupo] MATCH DIABETICA (só palavra): "Avaliação de retinopatia diabética"`);
    return 'Avaliação de retinopatia diabética';
  }
  if (subgrupoSemAcentos.includes('glaucoma')) {
    return 'Avaliação de glaucoma';
  }
  if (subgrupoSemAcentos.includes('catarata')) {
    return 'Avaliação de catarata';
  }
  if (subgrupoSemAcentos.includes('estrabismo')) {
    return 'Avaliação de estrabismo';
  }
  if (subgrupoSemAcentos.includes('pterigio')) {
    return 'Avaliação de pterígio';
  }
  
  // Se não encontrou correspondência, retorna Outros mas avisa
  console.warn(`[WARN] Subgrupo não reconhecido: "${subgrupoTrimmed}". Usando "Outros" como padrão.`);
  console.warn(`[WARN] Tentativas: lowercase="${subgrupoLower}", semAcentos="${subgrupoSemAcentos}"`);
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
    const { spreadsheetId, sheetName = 'LIMOEIRO', range = 'A3:M1000', apiKey } = config;
    
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
            let indicesColunas: { [key: string]: number } | undefined = undefined;
            for (let i = 0; i < Math.min(3, data.values.length); i++) {
              const primeiroCampo = data.values[i]?.[0]?.toString().trim().toLowerCase() || '';
              if (primeiroCampo.includes('nome') && primeiroCampo.includes('paciente')) {
                linhaInicial = i;
                // Detectar índices das colunas baseado no cabeçalho
                indicesColunas = detectarIndicesColunas(data.values[i]);
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
              
              const paciente = linhaParaPaciente(linha, linhaInicial + index + 1, indicesColunas);
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
    let indicesColunas: { [key: string]: number } | undefined = undefined;
    for (let i = 0; i < Math.min(3, linhas.length); i++) {
      const valores = parseCSVLine(linhas[i]);
      const primeiroCampo = valores[0]?.toString().trim().toLowerCase() || '';
      // Se encontrar "nome" no primeiro campo, é cabeçalho
      if (primeiroCampo.includes('nome') && primeiroCampo.includes('paciente')) {
        linhaInicial = i;
        // Detectar índices das colunas baseado no cabeçalho
        indicesColunas = detectarIndicesColunas(valores);
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
      
      const paciente = linhaParaPaciente(valores, linhaInicial + index + 1, indicesColunas);
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

