import { useState, useEffect } from 'react';
import api from '@/lib/api';

export interface Alerta {
  id_alerta: number;
  tipo_alerta: string;
  mensagem: string;
  data_hora: string;
  id_lote: number;
}

export function useExpiryAlerts() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndCheckAlerts = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const hoje = new Date().toISOString().split('T')[0];
        const lastCheckDate = localStorage.getItem('lastExpiryCheckDate');

        // Se ainda não checou hoje, chama o endpoint de check-diario
        if (lastCheckDate !== hoje) {
          await api.post('/api/alerta/check-diario');
          localStorage.setItem('lastExpiryCheckDate', hoje);
        }

        // Depois de checar (ou se já checou hoje), busca as notificações do tipo VENCIMENTO_PROXIMO
        const response = await api.get('/api/alerta', {
          params: { tipo_alerta: 'VENCIMENTO_PROXIMO' }
        });

        const dataAlertas = response.data || [];
        
        // Filtra para pegar apenas os de hoje, caso no banco venham todos
        const alertasDeHoje = dataAlertas.filter((a: Alerta) => a.data_hora.startsWith(hoje));
        setAlertas(alertasDeHoje);

        // Checa se deve mostrar o popup na sessão atual
        if (alertasDeHoje.length > 0) {
          const popupShown = sessionStorage.getItem('expiryPopupShown');
          if (!popupShown) {
            setShowPopup(true);
            sessionStorage.setItem('expiryPopupShown', 'true');
          }
        }
      } catch (error) {
        console.error('Erro ao buscar alertas de validade:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAndCheckAlerts();
  }, []);

  const closePopup = () => setShowPopup(false);

  return { alertas, showPopup, closePopup, loading };
}
