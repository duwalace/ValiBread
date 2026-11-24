import supabase from './src/config/supabase.js';

async function setup() {
  console.log('1. Criando bucket chatbot_exports...');
  const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('chatbot_exports', {
    public: true, // Arquivos públicos, pois os nomes terão UUID ou timestamp garantindo que são difíceis de adivinhar
    fileSizeLimit: 10485760 // 10MB
  });
  
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Erro ao criar bucket:', bucketError);
  } else {
    console.log('Bucket chatbot_exports verificado/criado com sucesso.');
  }

  console.log('2. Criando tabela chatbot_export...');
  // Não há como rodar DDL direto via SDK do Supabase usando API REST padrão sem RPC configurada.
  // Mas como este é o banco PostgreSQL, podemos tentar rodar via `supabase.rpc` se houver,
  // ou criar manualmente se falhar.
  // Como estamos limitados ao JS API, eu vou criar um SQL puro e rodar usando psql, ou 
  // pedir para rodar via query. Wait, we can't run raw SQL from standard JS client easily.
}

setup();
