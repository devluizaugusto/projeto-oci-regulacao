export type SubgrupoOCI = 
  | 'Avaliação de retinopatia diabética'
  | 'Avaliação de glaucoma'
  | 'Avaliação de catarata'
  | 'Avaliação de estrabismo'
  | 'Avaliação de pterígio'
  | 'Outros';

export type StatusOCI = 
  | 'Pendente'
  | 'Em andamento'
  | 'Aguardando exames'
  | 'Concluída'
  | 'Cancelada';

export interface Paciente {
  id: string;
  nome: string;
  dataNascimento: string;
  idade: number;
  nomeMae: string;
  cpf: string;
  telefone: string;
  subgrupoOCI: SubgrupoOCI;
  subgrupoOCIOriginal?: string; // Valor original da planilha
  dataConsulta: string;
  prazoConclusao: string; // Data limite para conclusão
  validacao: {
    comparecimento: boolean;
    examesRealizados: boolean;
    statusAtual: StatusOCI;
  };
}

export interface EstatisticasMotivos {
  motivo: string; // Usar string para permitir valores originais da planilha
  quantidade: number;
  percentual: number;
}

export interface EstatisticasStatus {
  status: StatusOCI;
  quantidade: number;
  percentual: number;
}

export interface EstatisticasMensais {
  mes: string;
  consultas: number;
  ocisConcluidas: number;
  ocisPendentes: number;
  ocisPendentesConclusao: number; // OCI's que precisam ser concluídas
  percentualConsultas: number;
  percentualConcluidas: number;
  percentualPendentes: number;
}

