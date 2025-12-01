import { Paciente } from '../types';
import { calcularStatusPrazo, calcularDiasRestantes } from '../utils/calculos';
import { formatarCPF, formatarTelefone, formatarDataBR } from '../utils/masks';

interface PacienteCardProps {
  paciente: Paciente;
}

export const PacienteCard = ({ paciente }: PacienteCardProps) => {
  const statusPrazo = calcularStatusPrazo(paciente.prazoConclusao);
  const diasRestantes = calcularDiasRestantes(paciente.prazoConclusao);

  const getStatusColor = () => {
    switch (statusPrazo) {
      case 'verde':
        return '#4caf50';
      case 'amarelo':
        return '#ff9800';
      case 'vermelho':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusText = () => {
    if (diasRestantes < 0) return `Vencido há ${Math.abs(diasRestantes)} dias`;
    if (diasRestantes === 0) return 'Vence hoje';
    return `${diasRestantes} dias restantes`;
  };

  return (
    <div className="paciente-card">
      <div className="card-header">
        <h3>{paciente.nome}</h3>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="label">Data de Nascimento:</span>
          <span>{formatarDataBR(paciente.dataNascimento)}</span>
        </div>
        <div className="info-row">
          <span className="label">Idade:</span>
          <span>{paciente.idade} anos</span>
        </div>
        <div className="info-row">
          <span className="label">CPF:</span>
          <span>{formatarCPF(paciente.cpf)}</span>
        </div>
        <div className="info-row">
          <span className="label">Telefone:</span>
          <span>{formatarTelefone(paciente.telefone)}</span>
        </div>
        <div className="info-row">
          <span className="label">Subgrupo OCI:</span>
          <span className="subgrupo">{paciente.subgrupoOCI}</span>
        </div>
        <div className="info-row">
          <span className="label">Data Consulta:</span>
          <span>{formatarDataBR(paciente.dataConsulta)}</span>
        </div>
        <div className="info-row">
          <span className="label">Prazo Conclusão:</span>
          <span>{formatarDataBR(paciente.prazoConclusao)}</span>
        </div>
      </div>

      <div className="card-prazo" style={{ backgroundColor: getStatusColor() + '20', borderLeft: `4px solid ${getStatusColor()}` }}>
        <div className="prazo-indicator" style={{ color: getStatusColor() }}>
          <strong>{getStatusText()}</strong>
        </div>
      </div>
    </div>
  );
};

