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

## 🛠️ Tecnologias Utilizadas (Sugestão)

* **Backend:** Node.js com Express
* **Frontend:** React (Web) / React Native (Mobile)
* **Banco de Dados:** PostgreSQL (relacional, ideal para integridade de transações de estoque)
* **Infraestrutura/Containers:** Docker
* **Integração IoT/Hardware:** Leitores RFID integrados via API REST/MQTT

## ⚙️ Como Executar o Projeto

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/), [Docker](https://www.docker.com/) e o [Git](https://git-scm.com/) instalados em sua máquina.

### Passos para Instalação

1. Clone este repositório:
   ```bash
   git clone [https://github.com/seu-usuario/nome-do-repositorio.git](https://github.com/seu-usuario/nome-do-repositorio.git)
Acesse a pasta do projeto:

Bash
cd nome-do-repositorio
Instale as dependências do Backend e Frontend:

Bash
cd backend && npm install
cd ../frontend && npm install
Configure as variáveis de ambiente criando um arquivo .env baseado no .env.example.

Inicie o banco de dados e os serviços via Docker:

Bash
docker-compose up -d
Inicie a aplicação:

Bash
npm run dev
📈 Impacto e Benefícios Esperados
Redução expressiva de erros operacionais e retrabalhos.

Diminuição drástica de perdas de produtos por vencimento.

Otimização do layout físico do estoque e conformidade com normas sanitárias.

Gestão estratégica baseada em dados reais e atualizados.
