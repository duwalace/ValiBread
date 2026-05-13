import supabase from '../config/supabase.js';

export const listarExports = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chatbot_export')
      .select(`
        id_export,
        nome_arquivo,
        url_arquivo,
        data_geracao,
        id_usuario,
        usuario (
          nome,
          email
        )
      `)
      .order('data_geracao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar exports:', error);
      return res.status(500).json({ erro: 'Erro ao listar exports do chatbot.' });
    }

    // Remapear para facilitar o uso no frontend
    const result = data.map(item => ({
      id_export: item.id_export,
      nome_arquivo: item.nome_arquivo,
      url_arquivo: item.url_arquivo,
      data_geracao: item.data_geracao,
      usuario_nome: item.usuario?.nome || 'Desconhecido',
      usuario_email: item.usuario?.email || 'Desconhecido',
    }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Erro na listagem de exports:', error);
    return res.status(500).json({ erro: 'Erro interno no servidor.' });
  }
};
