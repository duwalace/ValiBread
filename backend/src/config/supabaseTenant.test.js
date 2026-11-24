import { describe, it, expect, vi } from 'vitest';
import { getTenantSupabase } from './supabaseTenant.js';
import * as supabaseLib from '@supabase/supabase-js';

// Mockamos a biblioteca externa para testarmos o comportamento estrutural da fábrica
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((url, key, options) => ({ url, key, options }))
}));

describe('Supabase Tenant Isolation (getTenantSupabase)', () => {
  it('should create a sandboxed client with the user JWT injected into global headers', () => {
    // Arrange
    const mockToken = 'mock-jwt-token-user-123';
    
    // Configurações falsas de ambiente que a fábrica precisará ler
    process.env.SUPABASE_URL = 'https://mock.supabase.co';
    process.env.SUPABASE_KEY = 'mock-anon-key';

    // Act
    const client = getTenantSupabase(mockToken);

    // Assert: Verificamos o resultado final gerado pela fábrica (o client configurado)
    // Isso garante que o RLS do PostgreSQL vai interceptar a requisição com a identidade do usuário.
    expect(client.options).toBeDefined();
    expect(client.options.global).toBeDefined();
    expect(client.options.global.headers).toBeDefined();
    expect(client.options.global.headers.Authorization).toBe(`Bearer ${mockToken}`);
    
    // Bônus: garante que url e key também foram passados corretamente
    expect(client.url).toBe('https://mock.supabase.co');
    expect(client.key).toBe('mock-anon-key');
  });
});
