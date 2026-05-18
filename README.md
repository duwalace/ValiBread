# 🍞 ValiBread — Sistema Inteligente de Gestão de Estoque RFID

![Status do Projeto](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)
![Licença](https://img.shields.io/badge/License-MIT-blue)

## 📖 Sobre o Projeto

O **ValiBread** é um sistema inteligente de gestão de estoque desenvolvido para a **TRES IRMÃOS INDÚSTRIA E COMÉRCIO DE PÃES LTDA**. O objetivo é solucionar desafios de organização, controle de validade e logística utilizando **RFID (Identificação por Radiofrequência)** combinado com um ecossistema de software moderno.

O sistema rastreia produtos de panificação desde a saída da linha de produção até a expedição, automatizando o inventário e fornecendo dados para tomada de decisão gerencial.

---

## 🚀 Funcionalidades Principais

- **Rastreabilidade Automatizada (RFID):** Registro de entrada/saída via portais de leitura RFID.
- **Controle de Validade (FEFO):** Monitoramento automático de datas, priorizando a expedição de produtos mais próximos ao vencimento.
- **Dashboard em Tempo Real:** Visualização centralizada de volume, localização e giro dos itens.
- **Assistente Virtual (Chatbot):** Consultas de estoque, indicadores e alertas em tempo real via WebSocket.
- **Alertas Automáticos:** Notificações e sugestões de reposição com base no fluxo de saídas.
- **Gestão Administrativa:** CRUD de Lotes, Pacotes, Usuários, Relatórios e Documentos exportáveis.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Backend | Node.js, Express 5, Supabase JS |
| Frontend Web | React 18, TypeScript, Vite, TailwindCSS, Shadcn UI |
| Banco de Dados | Supabase (PostgreSQL) + Supabase Storage |
| IoT / Hardware | Leitores RFID (ESP32 ou gateway compatível) |
| Autenticação | JWT (usuários) + API Key estática (hardware) |

---

## ⚙️ Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/)
- Uma conta no [Supabase](https://supabase.com/)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/duwalace/ValiBread.git
cd ValiBread

# 2. Instale todas as dependências (web, backend e chatbot)
npm run install:all

# 3. Configure as variáveis de ambiente
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais do Supabase e JWT_SECRET

# 4. Execute a stack completa (1 único terminal)
npm start
```

O comando `npm start` na raiz inicia **simultaneamente**:
- `[WEB]` Frontend React em `http://localhost:8080`
- `[BACKEND]` API Express em `http://localhost:3000`
- `[CHATBOT]` Servidor WebSocket em `http://localhost:3001`

---

## 📡 Integração com Hardware RFID

### Como funciona

O backend expõe um endpoint dedicado para receber leituras do hardware físico (ESP32, gateways UHF, etc.) sem exigir JWT — utiliza uma **API Key estática** configurada no `.env`.

### Endpoint de Leitura

```
POST /api/rfid/leitura
```

**Header obrigatório:**
```
X-Api-Key: <valor de RFID_API_KEY no .env>
```

**Body JSON:**
```json
{
  "epc": "E2000017220101181390E9FB",
  "id_leitor": 1,
  "rssi": -65
}
```

**Resposta de sucesso (`200`):**
```json
{
  "mensagem": "Leitura processada com sucesso.",
  "leitura_raw": { "id_leitura": 42, "epc": "...", "data_hora": "..." },
  "etiqueta": { "id_rfid": 5, "id_pacote": 12, "status": "ATIVO" },
  "movimentacao": { "id_movimentacao": 88, "tipo_movimentacao": "Saída", "data_hora": "..." },
  "alertas": [],
  "avisos": []
}
```

**Resposta quando EPC não está cadastrado (`200` com aviso):**
```json
{
  "leitura_raw": { ... },
  "etiqueta": null,
  "movimentacao": null,
  "alertas": [],
  "avisos": ["EPC E200... não encontrado no cadastro de etiquetas."]
}
```

### Fluxo automático na leitura

1. A leitura bruta é gravada em `leitura_rfid_raw` (sempre).
2. O sistema busca o EPC em `rfid_etiqueta`.
3. Determina o **tipo de movimentação** pelo campo `tipo_operacao` do leitor (`Entrada`, `Saída` ou `Transferência`).
4. Atualiza o `status` do pacote (`EM_ESTOQUE`, `EXPEDIDO`).
5. Registra a movimentação em `movimentacao_estoque`.
6. Dispara verificações de alerta de validade e estoque mínimo.

### Configurar `tipo_operacao` de um leitor

Ao cadastrar ou atualizar um leitor via API, defina `tipo_operacao`:

```bash
# Criar leitor de entrada (doca de recebimento)
POST /api/rfid/leitor
Authorization: Bearer <token_jwt>
{
  "codigo_equipamento": "RFID-RECV-01",
  "localizacao": "Doca de Recebimento",
  "tipo_operacao": "Entrada"
}

# Criar leitor de saída (doca de expedição)
POST /api/rfid/leitor
{
  "codigo_equipamento": "RFID-EXPE-01",
  "localizacao": "Doca de Expedição",
  "tipo_operacao": "Saída"
}
```

Valores aceitos para `tipo_operacao`: `"Entrada"` | `"Saída"` | `"Transferência"`

### Variável de ambiente `RFID_API_KEY`

Configure no `backend/.env`:
```env
RFID_API_KEY="chave_segura_para_o_hardware_rfid"
```

⚠️ Se `RFID_API_KEY` não estiver definida, o endpoint retorna `503` e todas as leituras de hardware são bloqueadas.

Configure a **mesma chave** no firmware do ESP32/leitor:
```cpp
// Arduino/ESP32 - exemplo
const char* apiKey = "chave_segura_para_o_hardware_rfid";
// Adicione no header da requisição HTTP:
// httpClient.addHeader("X-Api-Key", apiKey);
```

### Script SQL — Migração `tipo_operacao`

Se já possui leitores cadastrados no banco, execute o arquivo `db/04_rfid_tipo_operacao.sql` no SQL Editor do Supabase para adicionar a coluna `tipo_operacao` à tabela `leitor_rfid`.

---

## 📁 Estrutura de Pastas

```
ValiBread/
├── backend/          # API Express (Node.js)
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/  # authMiddleware.js, rfidApiKeyMiddleware.js
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/     # rfidService.js — lógica de negócio RFID
│   └── .env.example
├── chatbot/          # Servidor WebSocket (Socket.IO)
├── db/               # Scripts SQL de migração
├── web/              # Frontend React/TypeScript
└── package.json      # Scripts raiz (npm start, npm run install:all)
```

---

## 📈 Impacto e Benefícios Esperados

- Redução expressiva de erros operacionais e retrabalhos manuais.
- Diminuição de perdas por vencimento com rastreamento FEFO automatizado.
- Gestão estratégica baseada em dados reais e atualizados em tempo real.
- Conformidade com normas sanitárias de rastreabilidade de alimentos.
