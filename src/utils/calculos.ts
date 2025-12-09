import { Paciente, EstatisticasMotivos, EstatisticasMensais, EstatisticasStatus, SubgrupoOCI, StatusOCI } from '../types';
import { format, parse, differenceInDays, startOfDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export const calcularEstatisticasMotivos = (pacientes: Paciente[]): EstatisticasMotivos[] => {
  // Usar um Record com string para permitir qualquer valor da planilha
  const contagem: Record<string, number> = {};

  pacientes.forEach(paciente => {
    // Usar o valor original da planilha se disponível, senão usar o normalizado
    const motivo = paciente.subgrupoOCIOriginal || paciente.subgrupoOCI;
    
    // Garantir que o motivo não seja vazio
    if (motivo && motivo.trim().length > 0) {
      contagem[motivo] = (contagem[motivo] || 0) + 1;
    }
  });

  const total = pacientes.length;

  return Object.entries(contagem)
    .map(([motivo, quantidade]) => ({ 
      motivo, 
      quantidade,
      percentual: total > 0 ? Number(((quantidade / total) * 100).toFixed(2)) : 0
    }))
    .filter(item => item.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);
};

export const calcularEstatisticasStatus = (pacientes: Paciente[]): EstatisticasStatus[] => {
  const contagem: Record<StatusOCI, number> = {
    'Pendente': 0,
    'Em andamento': 0,
    'Aguardando exames': 0,
    'Concluída': 0,
    'Cancelada': 0,
  };

  pacientes.forEach(paciente => {
    const status = paciente.validacao?.statusAtual || 'Pendente';
    contagem[status] = (contagem[status] || 0) + 1;
  });

  const total = pacientes.length;

  return Object.entries(contagem)
    .map(([status, quantidade]) => ({ 
      status: status as StatusOCI, 
      quantidade,
      percentual: total > 0 ? Number(((quantidade / total) * 100).toFixed(2)) : 0
    }))
    .filter(item => item.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);
};

export const calcularEstatisticasMensais = (pacientes: Paciente[]): EstatisticasMensais[] => {
  const meses: Record<string, { consultas: number; concluidas: number; pendentes: number; pendentesConclusao: number }> = {};
  const anoAtual = new Date().getFullYear();
  const anoMinimo = 2000; // Ano mínimo aceito

  pacientes.forEach(paciente => {
    try {
      // Parsear a data de forma mais robusta
      let dataConsulta: Date;
      const partesData = paciente.dataConsulta.split('/');
      
      if (partesData.length === 3) {
        const dia = parseInt(partesData[0]);
        const mes = parseInt(partesData[1]) - 1; // Mês é 0-indexed
        const ano = parseInt(partesData[2]);
        
        // Validar ano - se for menor que 2000, provavelmente é erro
        // Aceitar apenas anos entre 2000 e ano atual + 10 (para permitir datas futuras)
        if (ano < anoMinimo || ano > anoAtual + 10) {
          console.error('Ano inválido na data:', paciente.dataConsulta, 'Ano:', ano);
          return;
        }
        
        // Criar a data diretamente para evitar problemas de parsing
        dataConsulta = new Date(ano, mes, dia);
        
        // Validar se a data é válida
        if (isNaN(dataConsulta.getTime()) || 
            dataConsulta.getFullYear() !== ano || 
            dataConsulta.getMonth() !== mes || 
            dataConsulta.getDate() !== dia) {
          console.error('Data inválida após criação:', paciente.dataConsulta);
          return;
        }
      } else {
        // Tentar parsing padrão se o formato não estiver correto
        dataConsulta = parse(paciente.dataConsulta, 'dd/MM/yyyy', new Date());
        
        if (isNaN(dataConsulta.getTime())) {
          console.error('Data inválida:', paciente.dataConsulta);
          return;
        }
        
        const ano = dataConsulta.getFullYear();
        if (ano < anoMinimo || ano > anoAtual + 10) {
          console.error('Ano inválido após parsing:', paciente.dataConsulta, 'Ano:', ano);
          return;
        }
      }
      
      const mesAnoFormatado = format(dataConsulta, 'MMMM yyyy', { locale: ptBR });
      // Capitalizar a primeira letra do mês
      const mesAno = mesAnoFormatado.charAt(0).toUpperCase() + mesAnoFormatado.slice(1);
      
      if (!meses[mesAno]) {
        meses[mesAno] = { consultas: 0, concluidas: 0, pendentes: 0, pendentesConclusao: 0 };
      }

      meses[mesAno].consultas += 1;

      const status = paciente.validacao?.statusAtual || 'Pendente';
      
      if (status === 'Concluída') {
        meses[mesAno].concluidas += 1;
      } else if (status !== 'Cancelada') {
        meses[mesAno].pendentes += 1;
        
        // Verificar se precisa ser concluída (não está concluída e não está cancelada)
        const hoje = new Date();
        const partesPrazo = paciente.prazoConclusao.split('/');
        let prazo: Date;
        
        if (partesPrazo.length === 3) {
          const anoPrazo = parseInt(partesPrazo[2]);
          if (anoPrazo >= anoMinimo && anoPrazo <= anoAtual + 10) {
            prazo = new Date(anoPrazo, parseInt(partesPrazo[1]) - 1, parseInt(partesPrazo[0]));
          } else {
            prazo = parse(paciente.prazoConclusao, 'dd/MM/yyyy', new Date());
          }
        } else {
          prazo = parse(paciente.prazoConclusao, 'dd/MM/yyyy', new Date());
        }
        
        if (!isNaN(prazo.getTime()) && prazo.getFullYear() >= anoMinimo && prazo >= hoje) {
          meses[mesAno].pendentesConclusao += 1;
        }
      }
    } catch (error) {
      console.error('Erro ao processar data:', paciente.dataConsulta, error);
    }
  });

  const totalConsultas = pacientes.length;
  const totalConcluidas = pacientes.filter(p => (p.validacao?.statusAtual || 'Pendente') === 'Concluída').length;
  const totalPendentes = pacientes.filter(p => {
    const status = p.validacao?.statusAtual || 'Pendente';
    return status !== 'Concluída' && status !== 'Cancelada';
  }).length;

  return Object.entries(meses)
    .map(([mes, dados]) => ({
      mes,
      consultas: dados.consultas,
      ocisConcluidas: dados.concluidas,
      ocisPendentes: dados.pendentes,
      ocisPendentesConclusao: dados.pendentesConclusao,
      percentualConsultas: totalConsultas > 0 ? Number(((dados.consultas / totalConsultas) * 100).toFixed(2)) : 0,
      percentualConcluidas: totalConcluidas > 0 ? Number(((dados.concluidas / totalConcluidas) * 100).toFixed(2)) : 0,
      percentualPendentes: totalPendentes > 0 ? Number(((dados.pendentes / totalPendentes) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => {
      // Converter para minúscula para fazer o parse correto, já que o locale espera minúscula
      const mesA = a.mes.charAt(0).toLowerCase() + a.mes.slice(1);
      const mesB = b.mes.charAt(0).toLowerCase() + b.mes.slice(1);
      const dataA = parse(mesA, 'MMMM yyyy', new Date(), { locale: ptBR });
      const dataB = parse(mesB, 'MMMM yyyy', new Date(), { locale: ptBR });
      return dataA.getTime() - dataB.getTime();
    });
};

export const calcularStatusPrazo = (prazoConclusao: string): 'verde' | 'amarelo' | 'vermelho' => {
  try {
    const prazo = startOfDay(parse(prazoConclusao, 'dd/MM/yyyy', new Date()));
    const hoje = startOfDay(new Date());
    const diasRestantes = differenceInDays(prazo, hoje);

    if (diasRestantes < 0) return 'vermelho'; // Vencido
    if (diasRestantes <= 7) return 'amarelo'; // Próximo do vencimento
    return 'verde'; // Dentro do prazo
  } catch {
    return 'vermelho';
  }
};

export const calcularDiasRestantes = (prazoConclusao: string): number => {
  try {
    const prazo = startOfDay(parse(prazoConclusao, 'dd/MM/yyyy', new Date()));
    const hoje = startOfDay(new Date());
    return differenceInDays(prazo, hoje);
  } catch {
    return -999;
  }
};

