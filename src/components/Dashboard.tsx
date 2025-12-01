import { Paciente } from '../types';
import { calcularEstatisticasMotivos, calcularEstatisticasMensais, calcularEstatisticasStatus } from '../utils/calculos';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  pacientes: Paciente[];
}

const CORES_MOTIVOS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe'];
const CORES_STATUS = ['#ff9800', '#2196f3', '#9c27b0', '#4caf50', '#f44336'];

export const Dashboard = ({ pacientes }: DashboardProps) => {
  const estatisticasMotivos = calcularEstatisticasMotivos(pacientes);
  const estatisticasStatus = calcularEstatisticasStatus(pacientes);
  const estatisticasMensais = calcularEstatisticasMensais(pacientes);

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
        <div className="dashboard-card">
          <h3>Estatísticas por Motivo/Subgrupo de OCI</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={estatisticasMotivos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="motivo" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'quantidade') {
                    return [`${value} (${props.payload.percentual}%)`, 'Quantidade'];
                  }
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="quantidade" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
          <div className="percentuais-list">
            {estatisticasMotivos.map((item) => (
              <div key={item.motivo} className="percentual-item">
                <span className="percentual-label">{item.motivo}:</span>
                <span className="percentual-value">{item.percentual}%</span>
                <span className="percentual-quantidade">({item.quantidade})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Estatísticas por Status das OCI's</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={estatisticasStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'quantidade') {
                    return [`${value} (${props.payload.percentual}%)`, 'Quantidade'];
                  }
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="quantidade" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
          <div className="percentuais-list">
            {estatisticasStatus.map((item) => (
              <div key={item.status} className="percentual-item">
                <span className="percentual-label">{item.status}:</span>
                <span className="percentual-value">{item.percentual}%</span>
                <span className="percentual-quantidade">({item.quantidade})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Distribuição por Status (Pizza)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={estatisticasStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percentual }) => `${status}: ${percentual}%`}
                outerRadius={100}
                fill="#82ca9d"
                dataKey="quantidade"
              >
                {estatisticasStatus.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES_STATUS[index % CORES_STATUS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, _name: string, props: any) => {
                  return [`${value} (${props.payload.percentual}%)`, 'Quantidade'];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card">
          <h3>Distribuição por Motivo (Pizza)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={estatisticasMotivos}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ motivo, percentual }) => `${motivo}: ${percentual}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="quantidade"
              >
                {estatisticasMotivos.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CORES_MOTIVOS[index % CORES_MOTIVOS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, _name: string, props: any) => {
                  return [`${value} (${props.payload.percentual}%)`, 'Quantidade'];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card full-width">
          <h3>Estatísticas Mensais - Consultas e OCI's por Mês</h3>
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={estatisticasMensais}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" angle={-45} textAnchor="end" height={120} />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string, props: any) => {
                  if (name === 'consultas') {
                    return [`${value} (${props.payload.percentualConsultas}%)`, 'Consultas'];
                  }
                  if (name === 'ocisConcluidas') {
                    return [`${value} (${props.payload.percentualConcluidas}%)`, "OCI's Concluídas"];
                  }
                  if (name === 'ocisPendentesConclusao') {
                    return [`${value}`, "OCI's que Precisam ser Concluídas"];
                  }
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="consultas" fill="#8884d8" name="Consultas" />
              <Bar dataKey="ocisConcluidas" fill="#4caf50" name="OCI's Concluídas" />
              <Bar dataKey="ocisPendentesConclusao" fill="#ff9800" name="OCI's que Precisam ser Concluídas" />
            </BarChart>
          </ResponsiveContainer>
          <div className="percentuais-list">
            {estatisticasMensais.map((item) => (
              <div key={item.mes} className="percentual-item">
                <span className="percentual-label">{item.mes}:</span>
                <span className="percentual-value">{item.percentualConsultas}%</span>
                <span className="percentual-quantidade">
                  ({item.consultas} consultas | {item.ocisConcluidas} concluídas | {item.ocisPendentesConclusao} precisam ser concluídas)
                </span>
              </div>
            ))}
          </div>
        </div>

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
                {pacientes.filter(p => p.validacao?.comparecimento).length}
              </div>
              <div className="resumo-label">Comparecimentos</div>
              <div className="resumo-percentual">
                {pacientes.length > 0 
                  ? ((pacientes.filter(p => p.validacao?.comparecimento).length / pacientes.length) * 100).toFixed(1)
                  : 0}%
              </div>
            </div>
            <div className="resumo-item">
              <div className="resumo-valor">
                {pacientes.filter(p => p.validacao?.examesRealizados).length}
              </div>
              <div className="resumo-label">Exames Realizados</div>
              <div className="resumo-percentual">
                {pacientes.length > 0 
                  ? ((pacientes.filter(p => p.validacao?.examesRealizados).length / pacientes.length) * 100).toFixed(1)
                  : 0}%
              </div>
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
          </div>
          <div className="resumo-percentuais-detalhados">
            <h4>Distribuição Percentual por Motivo:</h4>
            <div className="percentuais-grid">
              {estatisticasMotivos.map((item) => (
                <div key={item.motivo} className="percentual-detalhado-item">
                  <div className="percentual-detalhado-header">
                    <span className="percentual-detalhado-label">{item.motivo}</span>
                    <span className="percentual-detalhado-value">{item.percentual}%</span>
                  </div>
                  <div className="percentual-detalhado-bar">
                    <div 
                      className="percentual-detalhado-bar-fill" 
                      style={{ width: `${item.percentual}%` }}
                    ></div>
                  </div>
                  <div className="percentual-detalhado-quantidade">{item.quantidade} pacientes</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

