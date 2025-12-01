import { Paciente, StatusOCI } from '../types';

const STORAGE_KEY = 'oci-pacientes';

/**
 * Normaliza um paciente para garantir que tenha todas as propriedades necessárias
 */
const normalizarPaciente = (paciente: any): Paciente => {
  return {
    ...paciente,
    validacao: paciente.validacao || {
      comparecimento: false,
      examesRealizados: false,
      statusAtual: 'Pendente' as StatusOCI,
    },
  };
};

export const salvarPacientes = (pacientes: Paciente[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pacientes));
};

export const carregarPacientes = (): Paciente[] => {
  const dados = localStorage.getItem(STORAGE_KEY);
  if (!dados) return [];
  try {
    const pacientes = JSON.parse(dados);
    // Normalizar todos os pacientes para garantir que tenham validacao
    return pacientes.map(normalizarPaciente);
  } catch {
    return [];
  }
};

export const adicionarPaciente = (paciente: Paciente): void => {
  const pacientes = carregarPacientes();
  pacientes.push(paciente);
  salvarPacientes(pacientes);
};

export const atualizarPaciente = (id: string, atualizacoes: Partial<Paciente>): void => {
  const pacientes = carregarPacientes();
  const index = pacientes.findIndex(p => p.id === id);
  if (index !== -1) {
    pacientes[index] = { ...pacientes[index], ...atualizacoes };
    salvarPacientes(pacientes);
  }
};

export const removerPaciente = (id: string): void => {
  const pacientes = carregarPacientes();
  const pacientesFiltrados = pacientes.filter(p => p.id !== id);
  salvarPacientes(pacientesFiltrados);
};

