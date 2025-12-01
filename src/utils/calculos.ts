import { Paciente, EstatisticasMotivos, EstatisticasMensais, EstatisticasStatus, SubgrupoOCI, StatusOCI } from '../types';
import { format, parse, differenceInDays } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export const calcularEstatisticasMotivos = (pacientes: Paciente[]): EstatisticasMotivos[] => {
  const contagem: Record<SubgrupoOCI, number> = {
    'Avaliação de retinopatia diabética': 0,
    'Avaliação de glaucoma': 0,
    'Avaliação de catarata': 0,
    'Avaliação de estrabismo': 0,
    'Avaliação de pterígio': 0,
    'Outros': 0,
  };

  pacientes.forEach(paciente => {
    contagem[paciente.subgrupoOCI] = (contagem[paciente.subgrupoOCI] || 0) + 1;
  });

  const total = pacientes.length;

  return Object.entries(contagem)
    .map(([motivo, quantidade]) => ({ 
      motivo: motivo as SubgrupoOCI, 
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

  pacientes.forEach(paciente => {
    try {
      const dataConsulta = parse(paciente.dataConsulta, 'dd/MM/yyyy', new Date());
      const mesAno = format(dataConsulta, 'MMMM yyyy', { locale: ptBR });
      
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
        const prazo = parse(paciente.prazoConclusao, 'dd/MM/yyyy', new Date());
        if (prazo >= hoje) {
          meses[mesAno].pendentesConclusao += 1;
        }
      }
    } catch (error) {
      console.error('Erro ao processar data:', paciente.dataConsulta);
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
      const dataA = parse(a.mes, 'MMMM yyyy', new Date(), { locale: ptBR });
      const dataB = parse(b.mes, 'MMMM yyyy', new Date(), { locale: ptBR });
      return dataA.getTime() - dataB.getTime();
    });
};

export const calcularStatusPrazo = (prazoConclusao: string): 'verde' | 'amarelo' | 'vermelho' => {
  try {
    const prazo = parse(prazoConclusao, 'dd/MM/yyyy', new Date());
    const hoje = new Date();
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
    const prazo = parse(prazoConclusao, 'dd/MM/yyyy', new Date());
    const hoje = new Date();
    return differenceInDays(prazo, hoje);
  } catch {
    return -999;
  }
};

