# 🍞 Sistema Inteligente de Gestão de Estoque RFID

![Status do Projeto](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)
![Licença](https://img.shields.io/badge/License-MIT-blue)

## 📖 Sobre o Projeto
Este projeto é um sistema inteligente e acessível de gestão de estoque desenvolvido para a **TRES IRMÃOS INDÚSTRIA E COMÉRCIO DE PÃES LTDA**. O objetivo principal é solucionar desafios de organização, controle de validade e logística na cadeia de suprimentos da fábrica, utilizando a tecnologia **RFID (Identificação por Radiofrequência)** combinada com um ecossistema de software moderno.

O sistema rastreia os produtos de panificação desde a saída da linha de produção até a expedição, automatizando o inventário e fornecendo dados cruciais para a tomada de decisão gerencial.

## 🚀 Funcionalidades Principais

* **Rastreabilidade Automatizada (RFID):** Registro instantâneo de entrada e saída de produtos através de portais de leitura RFID, eliminando conferências manuais.
* **Controle Inteligente de Validade (FEFO):** Monitoramento automático de datas de fabricação e validade, priorizando a expedição de produtos próximos ao vencimento para reduzir perdas.
* **Dashboard Interativo e em Tempo Real:** Visualização centralizada do volume, localização e giro dos itens armazenados.
* **Assistente Virtual (Chatbot):** Acesso rápido a consultas de estoque, indicadores de desempenho e alertas via chatbot em dispositivos móveis.
* **Alertas e Reposição:** Emissão de notificações em tempo real e sugestões automáticas de produção/reposição baseadas no fluxo de vendas.

## 🛠️ Tecnologias Utilizadas

* **Backend:** Node.js 
* **Frontend Web:** React.js
* **Frontend Mobile:** React Native
* **Banco de Dados & BaaS:** Supabase (PostgreSQL)
* **Integração IoT/Hardware:** Leitores RFID 

## ⚙️ Como Executar o Projeto

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) e o [Git](https://git-scm.com/) instalados em sua máquina. Para o banco de dados, você precisará de uma conta configurada no [Supabase](https://supabase.com/).

### Passos para Instalação

1. Clone este repositório:
   ```bash
   git clone [https://github.com/seu-usuario/nome-do-repositorio.git](https://github.com/seu-usuario/nome-do-repositorio.git)
Acesse a pasta do projeto:

Bash
cd nome-do-repositorio
Instale as dependências do Backend, Frontend Web e Mobile:

Bash
cd backend && npm install
cd ../web && npm install
cd ../mobile && npm install
Configure as variáveis de ambiente criando os arquivos .env baseados nos .env.example (incluindo as chaves da API do Supabase).

Inicie as aplicações:

No backend: npm run dev

No frontend web: npm run start (ou npm run dev dependendo do seu bundler)

No mobile: npx expo start (caso usem Expo)

📈 Impacto e Benefícios Esperados
Redução expressiva de erros operacionais e retrabalhos.

Diminuição drástica de perdas de produtos por vencimento.

Otimização do layout físico do estoque e conformidade com normas sanitárias.

Gestão estratégica baseada em dados reais e atualizados.
