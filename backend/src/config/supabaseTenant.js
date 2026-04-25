import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

/**
 * Cria uma instância do Supabase "sandboxed" com o token do usuário.
 * Isso permite que as regras de RLS (Row-Level Security) do banco garantam 
 * o Isolamento de Tenant, prevenindo vulnerabilidades BOLA (Broken Object Level Authorization).
 * 
 * @param {string} userToken O JWT gerado na sessão do usuário.
 * @returns SupabaseClient configurado com o Authorization header.
 */
export const getTenantSupabase = (userToken) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Erro ao conectar ao Supabase: Credenciais não configuradas.');
  }

  if (!userToken) {
    throw new Error('userToken é obrigatório para garantir o Isolamento de Tenant.');
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    }
  });
};
