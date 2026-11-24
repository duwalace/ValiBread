import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { getTenantSupabase } from '../config/supabaseTenant.js';
import { buscarRelatorioMovimentacaoSecure } from './dashboardModel.js';

describe('Unit/Integration Test: dashboardModel JWT validation', () => {
  it('should successfully authenticate with Supabase using the real JWT Secret (GREEN STAGE)', async () => {
    // Usamos a chave real atualizada no .env que deve bater com a do Supabase
    const realSecret = process.env.JWT_SECRET;
    
    // Supabase RLS policies via JWT geralmente esperam a propriedade 'role' (ex: 'authenticated' ou o que for)
    // Para simplificar, focamos apenas na assinatura válida para não quebrar a criptografia.
    const payload = { sub: "1", role: 'authenticated' };

    const validToken = jwt.sign(payload, realSecret, { expiresIn: '1h' });
    const tenantSupabase = getTenantSupabase(validToken);

    // Como a chave é válida, não teremos erro criptográfico.
    // Pode retornar array vazio se não houver dados no banco, mas não vai "estourar" com reject.
    const result = await buscarRelatorioMovimentacaoSecure({ tipo: 'ENTRADA' }, tenantSupabase);
    
    // Garantimos que a resposta é um array (mesmo que vazio), provando sucesso na comunicação
    expect(Array.isArray(result)).toBe(true);
  });
});
