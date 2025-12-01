import { useState, useEffect, useRef } from 'react';
import { Paciente } from './types';
import { carregarPacientes, salvarPacientes } from './utils/storage';
import { buscarDadosGoogleSheets, GoogleSheetsConfig } from './utils/googleSheets';
import { PacienteCard } from './components/PacienteCard';
import { Dashboard } from './components/Dashboard';
import { GoogleSheetsConfigComponent } from './components/GoogleSheetsConfig';
import './App.css';

function App() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'lista' | 'dashboard'>('lista');
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(null);
  const [erroSincronizacao, setErroSincronizacao] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Carregar configuração salva
  useEffect(() => {
    const configSalva = localStorage.getItem('googleSheetsConfig');
    if (configSalva) {
      try {
        const config = JSON.parse(configSalva);
        setSheetsConfig(config);
      } catch (error) {
        console.error('Erro ao carregar configuração:', error);
      }
    }

    // Carregar dados iniciais do localStorage
    const dados = carregarPacientes();
    setPacientes(dados);
  }, []);

  // Função para sincronizar com Google Sheets
  const sincronizarComSheets = async (config: GoogleSheetsConfig) => {
    if (sincronizando) return;
    
    setSincronizando(true);
    setErroSincronizacao(null);

    try {
      const pacientesSheets = await buscarDadosGoogleSheets(config);
      
      // Substituir todos os dados pelos dados da planilha (validações vêm da planilha)
      salvarPacientes(pacientesSheets);
      setPacientes(pacientesSheets);
      setUltimaSincronizacao(new Date());
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
      setErroSincronizacao(error.message || 'Erro ao sincronizar com Google Sheets');
    } finally {
      setSincronizando(false);
    }
  };

  // Configurar sincronização automática
  useEffect(() => {
    if (!sheetsConfig) return;

    // Sincronizar imediatamente
    sincronizarComSheets(sheetsConfig);

    // Configurar intervalo de sincronização
    const intervaloSalvo = localStorage.getItem('syncInterval');
    const intervaloMs = (parseInt(intervaloSalvo || '30') || 30) * 1000;

    const intervalId = window.setInterval(() => {
      sincronizarComSheets(sheetsConfig);
    }, intervaloMs);
    
    intervalRef.current = intervalId;

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetsConfig]);

  // Limpar intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);


  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>Instrumento de Monitoramento e Avaliação - OCI Oftalmologia</h1>
          <p>Secretaria Municipal de Saúde - Central de Regulação</p>
        </div>
      </header>

      <nav className="app-nav">
        <div className="nav-buttons">
          <button
            className={abaAtiva === 'lista' ? 'active' : ''}
            onClick={() => setAbaAtiva('lista')}
          >
            Lista de Pacientes
          </button>
          <button
            className={abaAtiva === 'dashboard' ? 'active' : ''}
            onClick={() => setAbaAtiva('dashboard')}
          >
            Dashboard
          </button>
        </div>
        <div className="nav-actions">
          {sheetsConfig && (
            <button
              onClick={() => sincronizarComSheets(sheetsConfig)}
              disabled={sincronizando}
              className="btn btn-secondary"
              title="Sincronizar agora"
            >
              {sincronizando ? '🔄 Sincronizando...' : '🔄 Sincronizar'}
            </button>
          )}
          <GoogleSheetsConfigComponent
            onConfigChange={(config) => {
              setSheetsConfig(config);
              sincronizarComSheets(config);
            }}
            currentConfig={sheetsConfig}
          />
        </div>
      </nav>

      {sheetsConfig && (
        <div className="sync-status">
          {sincronizando && <span className="sync-indicator">🔄 Sincronizando...</span>}
          {ultimaSincronizacao && !sincronizando && (
            <span className="sync-success">
              ✓ Última sincronização: {ultimaSincronizacao.toLocaleTimeString('pt-BR')}
            </span>
          )}
          {erroSincronizacao && (
            <span className="sync-error">⚠️ {erroSincronizacao}</span>
          )}
        </div>
      )}

      <main className="app-main">
        {abaAtiva === 'lista' && (
          <>
            <div className="actions-bar">
              <div className="pacientes-count">
                Total: {pacientes.length} paciente(s)
              </div>
              {!sheetsConfig && (
                <div className="config-warning">
                  ⚠️ Configure a sincronização com Google Sheets para visualizar os pacientes
                </div>
              )}
            </div>

            {pacientes.length === 0 ? (
              <div className="empty-state">
                {sheetsConfig ? (
                  <>
                    <p>Nenhum paciente encontrado na planilha ainda.</p>
                    <p className="empty-hint">Adicione pacientes na planilha do Google Sheets e eles aparecerão aqui automaticamente.</p>
                    <button 
                      onClick={() => sheetsConfig && sincronizarComSheets(sheetsConfig)} 
                      className="btn btn-primary"
                      disabled={sincronizando}
                    >
                      {sincronizando ? '🔄 Sincronizando...' : '🔄 Sincronizar Agora'}
                    </button>
                  </>
                ) : (
                  <>
                    <p>Configure a sincronização com Google Sheets para começar.</p>
                    <p className="empty-hint">Clique em "⚙️ Configurar Sincronização" na barra de navegação.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="pacientes-grid">
                {pacientes.map(paciente => (
                  <PacienteCard
                    key={paciente.id}
                    paciente={paciente}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {abaAtiva === 'dashboard' && (
          <Dashboard pacientes={pacientes} />
        )}
      </main>
    </div>
  );
}

export default App;

