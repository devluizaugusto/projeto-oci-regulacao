import { useState, useEffect, useRef, FormEvent } from 'react';
import { GoogleSheetsConfig, extrairIdPlanilha } from '../utils/googleSheets';

interface GoogleSheetsConfigProps {
  onConfigChange: (config: GoogleSheetsConfig) => void;
  currentConfig: GoogleSheetsConfig | null;
}

export const GoogleSheetsConfigComponent = ({ onConfigChange, currentConfig }: GoogleSheetsConfigProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [sheetName, setSheetName] = useState(currentConfig?.sheetName || 'LIMOEIRO');
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [intervalo, setIntervalo] = useState(() => {
    const intervaloSalvo = localStorage.getItem('syncInterval');
    return intervaloSalvo ? parseInt(intervaloSalvo) : 30;
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (currentConfig) {
      setSheetName(currentConfig.sheetName || 'LIMOEIRO');
      setApiKey(currentConfig.apiKey || '');
    }
  }, [currentConfig]);

  // Fechar painel ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && 
          panelRef.current && 
          buttonRef.current &&
          !panelRef.current.contains(event.target as Node) &&
          !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const spreadsheetId = url ? extrairIdPlanilha(url) : currentConfig?.spreadsheetId;
    
    if (!spreadsheetId) {
      alert('Por favor, insira uma URL válida do Google Sheets');
      return;
    }

    const config: GoogleSheetsConfig = {
      spreadsheetId,
      sheetName,
      apiKey: apiKey || undefined,
      range: 'A3:H1000',
    };

    onConfigChange(config);
    setIsOpen(false);
    
    // Salvar configuração no localStorage
    localStorage.setItem('googleSheetsConfig', JSON.stringify(config));
    localStorage.setItem('syncInterval', intervalo.toString());
  };

  return (
    <div className="sheets-config">
      <button 
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)} 
        className="btn btn-secondary"
        style={{ marginLeft: '1rem' }}
      >
        {isOpen ? '▼' : '⚙️'} Configurar Sincronização
      </button>

      {isOpen && (
        <div className="config-panel" ref={panelRef}>
          <h3>Configuração de Sincronização com Google Sheets</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>URL da Planilha do Google Sheets *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                required={!currentConfig?.spreadsheetId}
              />
              {currentConfig?.spreadsheetId && (
                <small>ID atual: {currentConfig.spreadsheetId}</small>
              )}
            </div>

            <div className="form-group">
              <label>Nome da Aba (Sheet)</label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="LIMOEIRO"
              />
              <small>Ex: LIMOEIRO, BOM JARDIM, etc.</small>
            </div>
            <div className="form-group">
              <label>Estrutura da Planilha</label>
              <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                <strong>Colunas esperadas:</strong><br />
                A: Nome do Paciente<br />
                B: Data de Nascimento<br />
                C: Idade<br />
                D: Nome da Mãe<br />
                E: CPF<br />
                F: Telefone<br />
                G: Subgrupo de OCI<br />
                H: Data da Consulta<br />
                I: Comparecimento (SIM/NÃO/TRUE/FALSE/1/0/X/✓)<br />
                J: Exames Realizados (SIM/NÃO/TRUE/FALSE/1/0/X/✓)<br />
                K: Status Atual (Pendente, Em andamento, Aguardando exames, Concluída, Cancelada)
              </small>
            </div>

            <div className="form-group">
              <label>API Key (Opcional)</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Deixe vazio para planilhas públicas"
              />
              <small>Necessário apenas para planilhas privadas</small>
            </div>

            <div className="form-group">
              <label>Intervalo de Sincronização (segundos)</label>
              <input
                type="number"
                value={intervalo}
                onChange={(e) => setIntervalo(parseInt(e.target.value) || 30)}
                min="10"
                max="300"
              />
              <small>Atualização automática a cada X segundos</small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Salvar Configuração
              </button>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="btn btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

