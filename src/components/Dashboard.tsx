import { useState } from 'react';
import { Paciente } from '../types';
import { calcularEstatisticasMotivos, calcularEstatisticasMensais, calcularEstatisticasStatus, calcularStatusPrazo, calcularDiasRestantes } from '../utils/calculos';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatarDataBR } from '../utils/masks';
import { parse } from 'date-fns';

interface DashboardProps {
  pacientes: Paciente[];
}

const CORES_STATUS = ['#ff9800', '#2196f3', '#9c27b0', '#4caf50', '#f44336'];


export const Dashboard = ({ pacientes }: DashboardProps) => {
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroMotivo, setFiltroMotivo] = useState<string>('todos');
  const [ordenacao, setOrdenacao] = useState<'nome' | 'dataConsulta' | 'prazo'>('nome');

  const estatisticasMotivos = calcularEstatisticasMotivos(pacientes);
  const estatisticasStatus = calcularEstatisticasStatus(pacientes);
  const estatisticasMensais = calcularEstatisticasMensais(pacientes);

  // Filtrar e ordenar pacientes para a tabela
  const pacientesFiltrados = pacientes
    .filter(p => {
      if (filtroStatus !== 'todos' && p.validacao?.statusAtual !== filtroStatus) return false;
      if (filtroMotivo !== 'todos' && p.subgrupoOCI !== filtroMotivo) return false;
      return true;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case 'nome':
          return a.nome.localeCompare(b.nome);
        case 'dataConsulta':
          try {
            const dataA = parse(a.dataConsulta, 'dd/MM/yyyy', new Date());
            const dataB = parse(b.dataConsulta, 'dd/MM/yyyy', new Date());
            return dataB.getTime() - dataA.getTime();
          } catch {
            return 0;
          }
        case 'prazo':
          try {
            const prazoA = parse(a.prazoConclusao, 'dd/MM/yyyy', new Date());
            const prazoB = parse(b.prazoConclusao, 'dd/MM/yyyy', new Date());
            return prazoA.getTime() - prazoB.getTime();
          } catch {
            return 0;
          }
        default:
          return 0;
      }
    });

  const getStatusColor = (statusPrazo: 'verde' | 'amarelo' | 'vermelho') => {
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

  const getStatusText = (diasRestantes: number) => {
    if (diasRestantes < 0) return `Vencido há ${Math.abs(diasRestantes)} ${Math.abs(diasRestantes) === 1 ? 'dia' : 'dias'}`;
    if (diasRestantes === 0) return 'Vence hoje';
    return `${diasRestantes} ${diasRestantes === 1 ? 'dia restante' : 'dias restantes'}`;
  };

  const getStatusClass = (status: string): string => {
    return status
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard de Estatísticas</h2>
        <div className="dashboard-total">
          <span className="total-label">Total de Pacientes:</span>
          <span className="total-value">{pacientes.length}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Card de Comparecimento */}
        <div className="dashboard-card card-destaque">
          <div className="card-destaque-header">
            <h3>Comparecimento</h3>
            <div className="card-destaque-icon">✓</div>
          </div>
          <div className="card-destaque-content">
            <div className="card-destaque-valor">
              {pacientes.filter(p => p.validacao?.comparecimento).length}
            </div>
            <div className="card-destaque-total">
              de {pacientes.length} pacientes
            </div>
            <div className="card-destaque-percentual">
              {pacientes.length > 0 
                ? ((pacientes.filter(p => p.validacao?.comparecimento).length / pacientes.length) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>

        {/* Card de Exames Realizados */}
        <div className="dashboard-card card-destaque">
          <div className="card-destaque-header">
            <h3>Exames Realizados</h3>
            <div className="card-destaque-icon">🔬</div>
          </div>
          <div className="card-destaque-content">
            <div className="card-destaque-valor">
              {pacientes.filter(p => p.validacao?.examesRealizados).length}
            </div>
            <div className="card-destaque-total">
              de {pacientes.length} pacientes
            </div>
            <div className="card-destaque-percentual">
              {pacientes.length > 0 
                ? ((pacientes.filter(p => p.validacao?.examesRealizados).length / pacientes.length) * 100).toFixed(1)
                : 0}%
            </div>
          </div>
        </div>

        {/* Estatísticas por Motivo/Subgrupo de OCI */}
        <div className="dashboard-card">
          <h3>Motivo/Subgrupo de OCI - Estatística Comparativa</h3>
          <div className="estatistica-comparativa">
            <div className="estatistica-header">
              <span className="estatistica-label">Comparação de Quantidades</span>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={estatisticasMotivos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="motivo" type="category" width={200} />
                <Tooltip 
                  formatter={(value: number, _name: string, props: any) => {
                    return [`${value} pacientes (${props.payload.percentual}%)`, 'Quantidade'];
                  }}
                />
                <Legend />
                <Bar dataKey="quantidade" fill="#8884d8" name="Quantidade de Pacientes" />
              </BarChart>
            </ResponsiveContainer>
            <div className="percentuais-list">
              {estatisticasMotivos.map((item) => (
                <div key={item.motivo} className="percentual-item">
                  <span className="percentual-label">{item.motivo}:</span>
                  <span className="percentual-value">{item.percentual}%</span>
                  <span className="percentual-quantidade">({item.quantidade} pacientes)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estatísticas por Status */}
        <div className="dashboard-card">
          <h3>Estatísticas por Status das OCI's</h3>
          <div className="estatisticas-status-container">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart margin={{ top: 20, right: 120, bottom: 20, left: 120 }}>
                <Pie
                  data={estatisticasStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ status, percentual, quantidade, cx, cy, midAngle, outerRadius }) => {
                    const RADIAN = Math.PI / 180;
                    const radius = outerRadius + 25;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    
                    return (
                      <text 
                        x={x} 
                        y={y} 
                        fill="#333" 
                        textAnchor={x > cx ? 'start' : 'end'} 
                        dominantBaseline="central"
                        fontSize={11}
                        fontWeight={600}
                      >
                        {`${status}: ${quantidade} (${percentual}%)`}
                      </text>
                    );
                  }}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="quantidade"
                >
                  {estatisticasStatus.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_STATUS[index % CORES_STATUS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, _name: string, props: any) => {
                    return [`${value} pacientes (${props.payload.percentual}%)`, 'Quantidade'];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="status-list">
              {estatisticasStatus.map((item) => (
                <div key={item.status} className="status-item">
                  <div className="status-color" style={{ backgroundColor: CORES_STATUS[estatisticasStatus.indexOf(item) % CORES_STATUS.length] }}></div>
                  <span className="status-label">{item.status}:</span>
                  <span className="status-value">{item.quantidade}</span>
                  <span className="status-percentual">({item.percentual}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Estatísticas Mensais */}
        <div className="dashboard-card full-width">
          <h3>Estatísticas Mensais - Consultas e OCI's por Mês</h3>
          <div className="estatisticas-mensais-container">
            <ResponsiveContainer width="100%" height={500}>
              <BarChart data={estatisticasMensais}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" angle={-45} textAnchor="end" height={120} />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'consultas') {
                      return [`${value} consultas (${props.payload.percentualConsultas}%)`, 'Consultas'];
                    }
                    if (name === 'ocisConcluidas') {
                      return [`${value} OCI's concluídas (${props.payload.percentualConcluidas}%)`, "OCI's Concluídas"];
                    }
                    if (name === 'ocisPendentesConclusao') {
                      return [`${value} OCI's precisam ser concluídas`, "OCI's que Precisam ser Concluídas"];
                    }
                    return value;
                  }}
                />
                <Legend />
                <Bar dataKey="consultas" fill="#8884d8" name="Consultas Realizadas" />
                <Bar dataKey="ocisConcluidas" fill="#4caf50" name="OCI's Concluídas" />
                <Bar dataKey="ocisPendentesConclusao" fill="#ff9800" name="OCI's que Precisam ser Concluídas" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mensais-detalhes">
              {estatisticasMensais.map((item) => (
                <div key={item.mes} className="mensal-item">
                  <div className="mensal-header">
                    <span className="mensal-mes">{item.mes}</span>
                    <span className="mensal-total">{item.consultas} consultas</span>
                  </div>
                  <div className="mensal-stats">
                    <span className="mensal-stat concluidas">
                      ✓ {item.ocisConcluidas} concluídas ({item.percentualConcluidas}%)
                    </span>
                    <span className="mensal-stat pendentes">
                      ⚠ {item.ocisPendentesConclusao} precisam ser concluídas
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela Completa de Pacientes */}
        <div className="dashboard-card full-width">
          <div className="tabela-header">
            <h3>Tabela Completa de Pacientes</h3>
            <div className="tabela-info">
              <span className="total-registros">Total: {pacientesFiltrados.length} paciente(s)</span>
            </div>
          </div>
          
          <div className="tabela-filtros">
            <div className="filtro-group">
              <label>Filtrar por Status:</label>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="Pendente">Pendente</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Aguardando exames">Aguardando exames</option>
                <option value="Concluída">Concluída</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            <div className="filtro-group">
              <label>Filtrar por Motivo:</label>
              <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)}>
                <option value="todos">Todos</option>
                {estatisticasMotivos.map(motivo => (
                  <option key={motivo.motivo} value={motivo.motivo}>{motivo.motivo}</option>
                ))}
              </select>
            </div>
            <div className="filtro-group">
              <label>Ordenar por:</label>
              <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value as any)}>
                <option value="nome">Nome</option>
                <option value="dataConsulta">Data da Consulta</option>
                <option value="prazo">Prazo de Conclusão</option>
              </select>
            </div>
          </div>

          <div className="tabela-wrapper">
            <div className="tabela-container-moderna">
              <table className="tabela-pacientes-moderna">
                <thead>
                  <tr>
                    <th className="col-nome">Nome do Paciente</th>
                    <th className="col-subgrupo">Subgrupo OCI</th>
                    <th className="col-consulta">Data da Consulta</th>
                    <th className="col-prazo">Prazo Conclusão</th>
                    <th className="col-status-prazo">Status Prazo</th>
                    <th className="col-comparecimento">Comparecimento</th>
                    <th className="col-exames">Exames Realizados</th>
                    <th className="col-status">Status Atual</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientesFiltrados.map((paciente) => {
                    const statusPrazo = calcularStatusPrazo(paciente.prazoConclusao);
                    const diasRestantes = calcularDiasRestantes(paciente.prazoConclusao);
                    const corPrazo = getStatusColor(statusPrazo);
                    
                    return (
                      <tr key={paciente.id} className="tabela-row">
                        <td className="col-nome">
                          <div className="cell-content">
                            <strong>{paciente.nome || '-'}</strong>
                          </div>
                        </td>
                        <td className="col-subgrupo">
                          <div className="cell-content">
                            <span className="subgrupo-badge">{paciente.subgrupoOCI || '-'}</span>
                          </div>
                        </td>
                        <td className="col-consulta">
                          <div className="cell-content">
                            <strong className="data-destaque">{formatarDataBR(paciente.dataConsulta) || '-'}</strong>
                          </div>
                        </td>
                        <td className="col-prazo">
                          <div className="cell-content">
                            {formatarDataBR(paciente.prazoConclusao) || '-'}
                          </div>
                        </td>
                        <td className="col-status-prazo">
                          <div className="cell-content">
                            <div 
                              className="status-prazo-badge" 
                              style={{ 
                                backgroundColor: corPrazo + '20', 
                                borderLeft: `4px solid ${corPrazo}`,
                                color: corPrazo
                              }}
                            >
                              <strong>{getStatusText(diasRestantes)}</strong>
                            </div>
                          </div>
                        </td>
                        <td className="col-comparecimento">
                          <div className="cell-content">
                            <div className="checkbox-wrapper">
                              <input
                                type="checkbox"
                                checked={paciente.validacao?.comparecimento || false}
                                readOnly
                                disabled
                                className="checkbox-input"
                              />
                              <span className={`checkbox-label-moderna ${paciente.validacao?.comparecimento ? 'comparecimento-sim' : 'comparecimento-nao'}`}>
                                {paciente.validacao?.comparecimento ? 'SIM' : 'NÃO'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="col-exames">
                          <div className="cell-content">
                            <div className="checkbox-wrapper">
                              <input
                                type="checkbox"
                                checked={paciente.validacao?.examesRealizados || false}
                                readOnly
                                disabled
                                className="checkbox-input"
                              />
                              <span className={`checkbox-label-moderna ${paciente.validacao?.examesRealizados ? 'exames-sim' : 'exames-nao'}`}>
                                {paciente.validacao?.examesRealizados ? 'SIM' : 'NÃO'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="col-status">
                          <div className="cell-content">
                            {paciente.validacao?.statusAtual ? (
                              <span className={`status-badge-moderna status-${getStatusClass(paciente.validacao.statusAtual)}`}>
                                {paciente.validacao.statusAtual}
                              </span>
                            ) : (
                              <span className="status-badge-moderna status-pendente" style={{ opacity: 0.5 }}>
                                Não informado
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pacientesFiltrados.length === 0 && (
              <div className="tabela-vazia">
                <p>Nenhum paciente encontrado com os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumo Numérico */}
        <div className="dashboard-card full-width">
          <h3>Resumo Numérico e Percentuais</h3>
          <div className="resumo-grid">
            <div className="resumo-item">
              <div className="resumo-valor">{pacientes.length}</div>
              <div className="resumo-label">Total de Pacientes</div>
              <div className="resumo-percentual">100%</div>
            </div>
            <div className="resumo-item">
              <div className="resumo-valor">
                {estatisticasMotivos.reduce((acc, item) => acc + item.quantidade, 0)}
              </div>
              <div className="resumo-label">Total de OCI's</div>
              <div className="resumo-percentual">100%</div>
            </div>
            <div className="resumo-item">
              <div className="resumo-valor">
                {estatisticasMensais.reduce((acc, item) => acc + item.consultas, 0)}
              </div>
              <div className="resumo-label">Total de Consultas</div>
              <div className="resumo-percentual">100%</div>
            </div>
            <div className="resumo-item">
              <div className="resumo-valor">
                {pacientes.filter(p => p.validacao?.statusAtual === 'Concluída').length}
              </div>
              <div className="resumo-label">OCI's Concluídas</div>
              <div className="resumo-percentual">
                {pacientes.length > 0 
                  ? ((pacientes.filter(p => p.validacao?.statusAtual === 'Concluída').length / pacientes.length) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div className="resumo-item">
              <div className="resumo-valor">
                {pacientes.filter(p => {
                  const status = p.validacao?.statusAtual || 'Pendente';
                  return status !== 'Concluída' && status !== 'Cancelada';
                }).length}
              </div>
              <div className="resumo-label">OCI's Pendentes</div>
              <div className="resumo-percentual">
                {pacientes.length > 0 
                  ? ((pacientes.filter(p => {
                    const status = p.validacao?.statusAtual || 'Pendente';
                    return status !== 'Concluída' && status !== 'Cancelada';
                  }).length / pacientes.length) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div className="resumo-item">
              <div className="resumo-valor">
                {pacientes.filter(p => {
                  const statusPrazo = calcularStatusPrazo(p.prazoConclusao);
                  return statusPrazo === 'vermelho';
                }).length}
              </div>
              <div className="resumo-label">OCI's Vencidas</div>
              <div className="resumo-percentual">
                {pacientes.length > 0 
                  ? ((pacientes.filter(p => {
                    const statusPrazo = calcularStatusPrazo(p.prazoConclusao);
                    return statusPrazo === 'vermelho';
                  }).length / pacientes.length) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
