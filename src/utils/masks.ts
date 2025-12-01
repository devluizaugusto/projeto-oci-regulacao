/**
 * Aplica máscara de CPF (000.000.000-00)
 */
export const formatarCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  // Remove tudo que não é dígito
  const apenasDigitos = cpf.replace(/\D/g, '');
  
  // Aplica a máscara
  if (apenasDigitos.length <= 3) {
    return apenasDigitos;
  } else if (apenasDigitos.length <= 6) {
    return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3)}`;
  } else if (apenasDigitos.length <= 9) {
    return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6)}`;
  } else {
    return `${apenasDigitos.slice(0, 3)}.${apenasDigitos.slice(3, 6)}.${apenasDigitos.slice(6, 9)}-${apenasDigitos.slice(9, 11)}`;
  }
};

/**
 * Aplica máscara de telefone brasileiro
 * Formato: (00) 00000-0000 ou (00) 0000-0000
 */
export const formatarTelefone = (telefone: string): string => {
  if (!telefone) return '';
  
  // Remove tudo que não é dígito
  const apenasDigitos = telefone.replace(/\D/g, '');
  
  // Aplica a máscara baseada no tamanho
  if (apenasDigitos.length <= 2) {
    return `(${apenasDigitos}`;
  } else if (apenasDigitos.length <= 6) {
    return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2)}`;
  } else if (apenasDigitos.length <= 10) {
      // Telefone fixo: (00) 0000-0000
      return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 6)}-${apenasDigitos.slice(6)}`;
  } else {
    // Celular: (00) 00000-0000
    return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 7)}-${apenasDigitos.slice(7, 11)}`;
  }
};

/**
 * Formata data para formato brasileiro (DD/MM/AAAA)
 */
export const formatarDataBR = (data: string | Date): string => {
  if (!data) return '';
  
  try {
    // Se já está no formato DD/MM/AAAA, retorna como está
    if (typeof data === 'string') {
      const formatoBR = /^\d{2}\/\d{2}\/\d{4}$/;
      if (formatoBR.test(data.trim())) {
        return data.trim();
      }
    }
    
    let dataObj: Date;
    
    if (typeof data === 'string') {
      // Tenta parsear diferentes formatos
      // Formato DD/MM/AAAA
      if (data.includes('/')) {
        const partes = data.split('/');
        if (partes.length === 3) {
          const dia = parseInt(partes[0]);
          const mes = parseInt(partes[1]) - 1;
          const ano = parseInt(partes[2]);
          dataObj = new Date(ano, mes, dia);
        } else {
          dataObj = new Date(data);
        }
      } else {
        // Tenta parsear como data ISO ou outros formatos
        dataObj = new Date(data);
      }
    } else {
      dataObj = data;
    }
    
    // Verifica se a data é válida
    if (isNaN(dataObj.getTime())) {
      return data.toString();
    }
    
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
  } catch (error) {
    return data.toString();
  }
};

