import { useState, FormEvent } from 'react';
import { Paciente, SubgrupoOCI, StatusOCI } from '../types';
import { format, addDays } from 'date-fns';

interface PacienteFormProps {
  paciente?: Paciente;
  onSubmit: (paciente: Paciente) => void;
  onCancel: () => void;
}

const SUBGRUPOS: SubgrupoOCI[] = [
  'Avaliação de retinopatia diabética',
  'Avaliação de glaucoma',
  'Avaliação de catarata',
  'Avaliação de estrabismo',
  'Avaliação de pterígio',
  'Outros',
];

const STATUS: StatusOCI[] = [
  'Pendente',
  'Em andamento',
  'Aguardando exames',
  'Concluída',
  'Cancelada',
];

export const PacienteForm = ({ paciente, onSubmit, onCancel }: PacienteFormProps) => {
  const [formData, setFormData] = useState({
    nome: paciente?.nome || '',
    dataNascimento: paciente?.dataNascimento || '',
    idade: paciente?.idade || 0,
    nomeMae: paciente?.nomeMae || '',
    cpf: paciente?.cpf || '',
    telefone: paciente?.telefone || '',
    subgrupoOCI: paciente?.subgrupoOCI || SUBGRUPOS[0],
    dataConsulta: paciente?.dataConsulta || format(new Date(), 'dd/MM/yyyy'),
    prazoConclusao: paciente?.prazoConclusao || format(addDays(new Date(), 30), 'dd/MM/yyyy'),
    comparecimento: paciente?.validacao.comparecimento || false,
    examesRealizados: paciente?.validacao.examesRealizados || false,
    statusAtual: paciente?.validacao.statusAtual || 'Pendente',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const novoPaciente: Paciente = {
      id: paciente?.id || crypto.randomUUID(),
      nome: formData.nome,
      dataNascimento: formData.dataNascimento,
      idade: formData.idade,
      nomeMae: formData.nomeMae,
      cpf: formData.cpf,
      telefone: formData.telefone,
      subgrupoOCI: formData.subgrupoOCI,
      dataConsulta: formData.dataConsulta,
      prazoConclusao: formData.prazoConclusao,
      validacao: {
        comparecimento: formData.comparecimento,
        examesRealizados: formData.examesRealizados,
        statusAtual: formData.statusAtual,
      },
    };

    onSubmit(novoPaciente);
  };

  return (
    <form onSubmit={handleSubmit} className="paciente-form">
      <h2>{paciente ? 'Editar Paciente' : 'Novo Paciente'}</h2>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Nome do Paciente *</label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Data de Nascimento *</label>
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={formData.dataNascimento}
            onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Idade *</label>
          <input
            type="number"
            value={formData.idade}
            onChange={(e) => setFormData({ ...formData, idade: parseInt(e.target.value) || 0 })}
            required
          />
        </div>

        <div className="form-group">
          <label>Nome da Mãe *</label>
          <input
            type="text"
            value={formData.nomeMae}
            onChange={(e) => setFormData({ ...formData, nomeMae: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>CPF *</label>
          <input
            type="text"
            value={formData.cpf}
            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Telefone *</label>
          <input
            type="text"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Subgrupo de OCI *</label>
          <select
            value={formData.subgrupoOCI}
            onChange={(e) => setFormData({ ...formData, subgrupoOCI: e.target.value as SubgrupoOCI })}
            required
          >
            {SUBGRUPOS.map(subgrupo => (
              <option key={subgrupo} value={subgrupo}>{subgrupo}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Data da Consulta *</label>
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={formData.dataConsulta}
            onChange={(e) => setFormData({ ...formData, dataConsulta: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Prazo para Conclusão *</label>
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={formData.prazoConclusao}
            onChange={(e) => setFormData({ ...formData, prazoConclusao: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Status Atual *</label>
          <select
            value={formData.statusAtual}
            onChange={(e) => setFormData({ ...formData, statusAtual: e.target.value as StatusOCI })}
            required
          >
            {STATUS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-checkboxes">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.comparecimento}
            onChange={(e) => setFormData({ ...formData, comparecimento: e.target.checked })}
          />
          Comparecimento
        </label>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.examesRealizados}
            onChange={(e) => setFormData({ ...formData, examesRealizados: e.target.checked })}
          />
          Exames Realizados
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {paciente ? 'Atualizar' : 'Adicionar'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
};


