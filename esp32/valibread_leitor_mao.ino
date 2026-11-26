/**
 * ValiBread — Firmware ESP32 Leitor de Mão
 * =========================================
 * Modos de operação:
 *   1. Cadastro  — seleciona produto/qtd/setor/lote → lê tag → confirma → envia API
 *   2. Leitura   — lê tag → exibe informações paginadas no LCD
 *   3. Saída     — lê tag → confirma saída → envia API
 *   4. Exclusão  — lê tag → confirma exclusão → envia API
 *
 * Hardware:
 *   - ESP32 DevKit C V4
 *   - RFID-RC522 (MFRC522) via SPI
 *   - LCD 16x2 I2C (endereço 0x27)
 *   - 3 botões: CIMA, BAIXO, GATILHO
 *
 * ══════════════════════════════════════════════════
 *  PINAGEM
 * ══════════════════════════════════════════════════
 *  MFRC522 → ESP32:
 *    SDA (SS) → GPIO 5
 *    SCK      → GPIO 18
 *    MOSI     → GPIO 23
 *    MISO     → GPIO 19
 *    RST      → GPIO 27
 *    3.3V     → 3.3V  (NUNCA 5V)
 *    GND      → GND
 *
 *  LCD I2C → ESP32:
 *    SDA → GPIO 21
 *    SCL → GPIO 22
 *    VCC → 3.3V
 *    GND → GND
 *
 *  Botões (INPUT_PULLUP, ativo em LOW):
 *    CIMA    → GPIO 32
 *    BAIXO   → GPIO 33
 *    GATILHO → GPIO 25
 *
 * ══════════════════════════════════════════════════
 *  BIBLIOTECAS NECESSÁRIAS (instale pelo Library Manager)
 * ══════════════════════════════════════════════════
 *   - MFRC522       (by miguelbalboa)
 *   - LiquidCrystal_I2C (by Frank de Brabander)
 *   - WiFi          (built-in ESP32 Core)
 *   - HTTPClient    (built-in ESP32 Core)
 *   - ArduinoJson   (by Benoit Blanchon) ← instale versão 7.x
 *
 * ══════════════════════════════════════════════════
 *  O QUE EDITAR ANTES DE GRAVAR
 * ══════════════════════════════════════════════════
 *   1. WIFI_SSID      → nome da sua rede Wi-Fi
 *   2. WIFI_PASSWORD  → senha da sua rede Wi-Fi
 *   3. API_HOST       → IP do servidor backend (ex: 192.168.1.100)
 *   4. API_PORT       → porta do backend (padrão 3000)
 *   5. RFID_API_KEY   → mesmo valor de RFID_API_KEY no backend/.env
 *   6. PRODUTOS[]     → lista de produtos cadastrados no sistema
 *   7. SETORES[]      → lista de setores disponíveis
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ══════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURAÇÕES — edite apenas esta seção
// ══════════════════════════════════════════════════════════════

const char* WIFI_SSID     = "SEU_WIFI_SSID";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";
const char* API_HOST      = "192.168.1.100";
const int   API_PORT      = 3000;
const char* RFID_API_KEY  = "SUA_CHAVE_API_RFID";   // igual ao backend/.env → RFID_API_KEY

// ── Arrays locais: mantenha sincronizados com o banco de dados ──
const char* PRODUTOS[] = {
  "Pao Frances",
  "Pao de Forma",
  "Baguete",
  "Croissant",
  "Pao Integral"
};
const int NUM_PRODUTOS = sizeof(PRODUTOS) / sizeof(PRODUTOS[0]);

const char* SETORES[] = {
  "Producao",
  "Estoque A",
  "Estoque B",
  "Expedicao"
};
const int NUM_SETORES = sizeof(SETORES) / sizeof(SETORES[0]);

// ══════════════════════════════════════════════════════════════
//  Pinos
// ══════════════════════════════════════════════════════════════

#define SS_PIN      5    // SDA / CS do MFRC522
#define RST_PIN     27   // RST do MFRC522
#define BTN_CIMA    32   // Botão Cima   (INPUT_PULLUP)
#define BTN_BAIXO   33   // Botão Baixo  (INPUT_PULLUP)
#define BTN_GATILHO 25   // Botão Gatilho / Confirmar (INPUT_PULLUP)
#define LED_OK      2    // LED embutido do ESP32

// ══════════════════════════════════════════════════════════════
//  Objetos globais
// ══════════════════════════════════════════════════════════════

LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 mfrc522(SS_PIN, RST_PIN);

// ══════════════════════════════════════════════════════════════
//  Constantes de comportamento
// ══════════════════════════════════════════════════════════════

#define TIMEOUT_HTTP      8000   // ms antes de desistir da requisição
#define DEBOUNCE_MS       200    // ms de debounce dos botões
#define RFID_READ_TIMEOUT 20000  // ms aguardando tag RFID (20s)

// ══════════════════════════════════════════════════════════════
//  Estado global do menu
// ══════════════════════════════════════════════════════════════

// Modos do menu principal
const char* MODOS[] = { "1.Cadastro", "2.Leitura", "3.Saida", "4.Exclusao" };
const int NUM_MODOS = 4;
int modoSelecionado = 0;  // índice no array MODOS

// Estado do cadastro (preservado entre etapas)
struct EstadoCadastro {
  int  idxProduto   = 0;
  int  qtdDigito1   = 0;   // dezena (0–9)
  int  qtdDigito2   = 0;   // unidade (0–9)
  int  idxSetor     = 0;
  int  loteDigito1  = 0;
  int  loteDigito2  = 0;
};
EstadoCadastro cad;

// EPC lido da tag (string hexadecimal)
String epcLido = "";

// Dados retornados pela API na consulta de leitura
struct DadosLeitura {
  String produto;
  String quantidade;
  String setor;
  String lote;
  String situacao;
};
DadosLeitura dadosLidos;
int campoLeituraAtual = 0;
const int NUM_CAMPOS_LEITURA = 5;

// ══════════════════════════════════════════════════════════════
//  Protótipos de função
// ══════════════════════════════════════════════════════════════

void   conectarWiFi();
bool   lerBotao(int pino);
int    navegarLista(int atual, const char* titulo, const char* itens[], int numItens);
int    selecionarDigito(int valorAtual, const String& titulo, const String& contexto);
// I-2: lerTagComTimeout() substitui aguardarTag() + lerEPC() — lê atomicamente
// para evitar race condition entre detecção e leitura do UID.
// Retorna string EPC em HEX maiúsculo, ou "" se timeout.
String lerTagComTimeout();
bool   confirmarAcao(const String& linha1, const String& linha2);
void   exibirMensagem(const String& l1, const String& l2, bool aguardarGatilho = false);
void   exibirErro(const String& msg);  // M-2: exibe erro quebrando em palavras
bool   garantirWiFi();                 // M-1: reconexão automática

// Fluxos dos modos
void modoMenuPrincipal();
void modoCadastro();
void modoLeitura();
void modoSaida();
void modoExclusao();

// Comunicação com API
bool   apiCadastrar(const String& epc, const String& produto, int quantidade,
                    const String& setor, int lote, String& msgRetorno);
bool   apiConsultar(const String& epc, DadosLeitura& dados, String& msgErro);
bool   apiSaida(const String& epc, String& msgRetorno);
bool   apiExcluir(const String& epc, String& msgRetorno);

// ══════════════════════════════════════════════════════════════
//  SETUP
// ══════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);

  // LCD
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("ValiBread v2.0");
  lcd.setCursor(0, 1);
  lcd.print("Iniciando...");

  // Botões
  pinMode(BTN_CIMA,    INPUT_PULLUP);
  pinMode(BTN_BAIXO,   INPUT_PULLUP);
  pinMode(BTN_GATILHO, INPUT_PULLUP);
  pinMode(LED_OK,      OUTPUT);

  // RFID
  SPI.begin();
  mfrc522.PCD_Init();

  // M-6: Verifica se o módulo RC522 está conectado e respondendo.
  // Se não estiver (solda ruim, cabo solto), informa no LCD e trava
  // em vez de entrar em loop silencioso lendo tags que nunca chegam.
  byte versao = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if (versao == 0x00 || versao == 0xFF) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Erro: RC522");
    lcd.setCursor(0, 1);
    lcd.print("nao detectado!");
    Serial.println("[RFID] ERRO: RC522 nao detectado (versao=0x" + String(versao, HEX) + ")");
    while (true) delay(1000); // trava — requer reinício após corrigir a conexão
  }
  Serial.print("[RFID] RC522 versao: 0x"); Serial.println(versao, HEX);

  // Wi-Fi
  conectarWiFi();

  delay(1000);
  lcd.clear();
}

// ══════════════════════════════════════════════════════════════
//  LOOP — executa o menu principal repetidamente
// ══════════════════════════════════════════════════════════════

void loop() {
  modoMenuPrincipal();
}

// ══════════════════════════════════════════════════════════════
//  MENU PRINCIPAL
// ══════════════════════════════════════════════════════════════

void modoMenuPrincipal() {
  modoSelecionado = navegarLista(modoSelecionado, "Selecione modo:", MODOS, NUM_MODOS);

  switch (modoSelecionado) {
    case 0: modoCadastro(); break;
    case 1: modoLeitura();  break;
    case 2: modoSaida();    break;
    case 3: modoExclusao(); break;
  }
}

// ══════════════════════════════════════════════════════════════
//  MODO 1 — CADASTRO
// ══════════════════════════════════════════════════════════════

void modoCadastro() {
  // Reinicia estado do cadastro
  cad = EstadoCadastro();

  // ── Etapa 1: Produto ──
  exibirMensagem("Cadastro", "Etapa 1/5");
  delay(600);
  cad.idxProduto = navegarLista(cad.idxProduto, "Produto:", PRODUTOS, NUM_PRODUTOS);

  // ── Etapa 2: Quantidade (2 dígitos) ──
  exibirMensagem("Quantidade", "Etapa 2/5");
  delay(600);
  cad.qtdDigito1 = selecionarDigito(cad.qtdDigito1, "Qtd dezena:", String(PRODUTOS[cad.idxProduto]));
  cad.qtdDigito2 = selecionarDigito(cad.qtdDigito2, "Qtd unidade:", String(PRODUTOS[cad.idxProduto]));
  int quantidade = cad.qtdDigito1 * 10 + cad.qtdDigito2;

  // ── Etapa 3: Setor ──
  exibirMensagem("Setor", "Etapa 3/5");
  delay(600);
  cad.idxSetor = navegarLista(cad.idxSetor, "Setor:", SETORES, NUM_SETORES);

  // ── Etapa 4: Lote (2 dígitos) ──
  // I-3: contexto exibe o nome do produto selecionado (não a quantidade)
  exibirMensagem("Lote", "Etapa 4/5");
  delay(600);
  cad.loteDigito1 = selecionarDigito(cad.loteDigito1, "Lote dezena:", String(PRODUTOS[cad.idxProduto]));
  cad.loteDigito2 = selecionarDigito(cad.loteDigito2, "Lote unidade:", String(PRODUTOS[cad.idxProduto]));
  int lote = cad.loteDigito1 * 10 + cad.loteDigito2;

  // ── Etapa 5a: Leitura da tag ──
  // I-2: lerTagComTimeout() detecta e lê o UID atomicamente, sem intervalo
  exibirMensagem("Aprox. a fita", "ao leitor...");
  epcLido = lerTagComTimeout();
  if (epcLido.length() == 0) {
    exibirMensagem("Tempo esgotado", "Voltando...", false);
    delay(1800);
    return;
  }
  Serial.print("EPC lido: "); Serial.println(epcLido);

  // ── Etapa 5b: Confirmação ──
  if (!confirmarAcao("Confirmar", "cadastro?")) {
    exibirMensagem("Cancelado", "Voltando...", false);
    delay(1500);
    return;
  }

  // ── Etapa 6: Envio à API ──
  exibirMensagem("Enviando...", "Aguarde");
  String msg;
  bool ok = apiCadastrar(epcLido, String(PRODUTOS[cad.idxProduto]), quantidade,
                         String(SETORES[cad.idxSetor]), lote, msg);

  if (ok) {
    exibirMensagem("Cadastrado!", "OK — pressione", true);
  } else {
    exibirErro(msg);
  }
}

// ══════════════════════════════════════════════════════════════
//  MODO 2 — LEITURA
// ══════════════════════════════════════════════════════════════

void modoLeitura() {
  // ── Leitura da tag ──
  exibirMensagem("Aprox. a fita", "ao leitor...");
  // I-2: lerTagComTimeout() detecta e lê o UID atomicamente
  epcLido = lerTagComTimeout();
  if (epcLido.length() == 0) {
    exibirMensagem("Tempo esgotado", "Voltando...", false);
    delay(1800);
    return;
  }

  // ── Consulta à API ──
  exibirMensagem("Consultando...", "Aguarde");
  String msgErro;
  bool ok = apiConsultar(epcLido, dadosLidos, msgErro);

  if (!ok) {
    // tag não encontrada ou erro de comunicação
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(msgErro.substring(0, 16));
    if (msgErro.length() > 16) {
      lcd.setCursor(0, 1);
      lcd.print(msgErro.substring(16, 32));
    }
    delay(2500);
    exibirMensagem("Pressione para", "voltar", true);
    return;
  }

  // ── Exibição paginada dos campos ──
  // Campos: Produto, Quantidade, Setor, Lote, Situacao
  String campos[NUM_CAMPOS_LEITURA][2] = {
    {"Produto:",     dadosLidos.produto},
    {"Quantidade:",  dadosLidos.quantidade},
    {"Setor:",       dadosLidos.setor},
    {"Lote:",        dadosLidos.lote},
    {"Situacao:",    dadosLidos.situacao},
  };

  campoLeituraAtual = 0;
  bool sair = false;

  while (!sair) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(campos[campoLeituraAtual][0]);
    lcd.setCursor(0, 1);
    lcd.print(campos[campoLeituraAtual][1].substring(0, 16));

    // Aguarda ação dos botões
    bool aguardando = true;
    while (aguardando) {
      if (lerBotao(BTN_CIMA)) {
        campoLeituraAtual = (campoLeituraAtual - 1 + NUM_CAMPOS_LEITURA) % NUM_CAMPOS_LEITURA;
        aguardando = false;
      } else if (lerBotao(BTN_BAIXO)) {
        campoLeituraAtual = (campoLeituraAtual + 1) % NUM_CAMPOS_LEITURA;
        aguardando = false;
      } else if (lerBotao(BTN_GATILHO)) {
        sair = true;
        aguardando = false;
      }
      delay(50);
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  MODO 3 — SAÍDA
// ══════════════════════════════════════════════════════════════

void modoSaida() {
  // ── Leitura da tag ──
  exibirMensagem("Aprox. a fita", "ao leitor...");
  // I-2: lerTagComTimeout() detecta e lê o UID atomicamente
  epcLido = lerTagComTimeout();
  if (epcLido.length() == 0) {
    exibirMensagem("Tempo esgotado", "Voltando...", false);
    delay(1800);
    return;
  }

  // ── C-2: Consulta prévia — verifica existência e situação ANTES da confirmação ──
  exibirMensagem("Verificando...", "Aguarde");
  String msgErroConsulta;
  DadosLeitura dadosTemp;
  bool encontrado = apiConsultar(epcLido, dadosTemp, msgErroConsulta);

  if (!encontrado) {
    exibirErro(msgErroConsulta);
    return;
  }

  // Situação já é "EXPEDIDO" — impede nova saída
  if (dadosTemp.situacao == "EXPEDIDO") {
    exibirMensagem("Ja possui", "saida registr.!", false);
    delay(3000);
    return;
  }

  // ── Confirmação (só chega aqui se EM_ESTOQUE) ──
  if (!confirmarAcao("Registrar", "saida?")) {
    exibirMensagem("Cancelado", "Voltando...", false);
    delay(1500);
    return;
  }

  // ── Envio à API ──
  exibirMensagem("Registrando...", "Aguarde");
  String msg;
  bool ok = apiSaida(epcLido, msg);

  if (ok) {
    exibirMensagem("Saida registr.!", "Pressione", true);
  } else {
    exibirErro(msg);
  }
}

// ══════════════════════════════════════════════════════════════
//  MODO 4 — EXCLUSÃO
// ══════════════════════════════════════════════════════════════

void modoExclusao() {
  // ── Leitura da tag ──
  exibirMensagem("Aprox. a fita", "ao leitor...");
  // I-2: lerTagComTimeout() detecta e lê o UID atomicamente
  epcLido = lerTagComTimeout();
  if (epcLido.length() == 0) {
    exibirMensagem("Tempo esgotado", "Voltando...", false);
    delay(1800);
    return;
  }

  // ── Confirmação ──
  if (!confirmarAcao("Excluir este", "registro?")) {
    exibirMensagem("Cancelado", "Voltando...", false);
    delay(1500);
    return;
  }

  // ── Envio à API ──
  exibirMensagem("Excluindo...", "Aguarde");
  String msg;
  bool ok = apiExcluir(epcLido, msg);

  if (ok) {
    exibirMensagem("Excluido!", "Pressione", true);
  } else {
    exibirErro(msg);
  }
}

// ══════════════════════════════════════════════════════════════
//  HELPERS DE UI
// ══════════════════════════════════════════════════════════════

/**
 * Exibe menu de lista com navegação cima/baixo e confirmação por gatilho.
 * Retorna o índice selecionado.
 * I-4: parâmetro 'total' removido — era redundante com 'numItens'.
 */
int navegarLista(int atual, const char* titulo, const char* itens[], int numItens) {
  int idx = atual;
  while (true) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(titulo);
    lcd.setCursor(0, 1);
    // Exibe item com indicador de posição
    String linha = ">";
    linha += String(itens[idx]).substring(0, 14);
    lcd.print(linha);

    // Aguarda botão
    bool aguardando = true;
    while (aguardando) {
      if (lerBotao(BTN_CIMA)) {
        idx = (idx - 1 + numItens) % numItens;
        aguardando = false;
      } else if (lerBotao(BTN_BAIXO)) {
        idx = (idx + 1) % numItens;
        aguardando = false;
      } else if (lerBotao(BTN_GATILHO)) {
        return idx;
      }
      delay(50);
    }
  }
}

/**
 * Seleciona um único dígito (0–9) com cima/baixo e confirma por gatilho.
 * título: label na linha 0, contexto: informação extra na linha 1.
 */
int selecionarDigito(int valorAtual, const String& titulo, const String& contexto) {
  int val = valorAtual;
  while (true) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(titulo.substring(0, 16));
    lcd.setCursor(0, 1);
    lcd.print(contexto.substring(0, 12));
    lcd.print(" [");
    lcd.print(val);
    lcd.print("]");

    bool aguardando = true;
    while (aguardando) {
      if (lerBotao(BTN_CIMA)) {
        val = (val + 1) % 10;
        aguardando = false;
      } else if (lerBotao(BTN_BAIXO)) {
        val = (val - 1 + 10) % 10;
        aguardando = false;
      } else if (lerBotao(BTN_GATILHO)) {
        return val;
      }
      delay(50);
    }
  }
}

/**
 * Exibe uma pergunta de Sim/Não navegável.
 * Retorna true = Sim, false = Não.
 */
bool confirmarAcao(const String& linha1, const String& linha2) {
  int opcao = 0; // 0 = Sim, 1 = Nao
  const char* opcoes[] = { "Sim", "Nao" };

  while (true) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(linha1.substring(0, 16));
    lcd.setCursor(0, 1);
    lcd.print(linha2.substring(0, 10));
    lcd.print(" >");
    lcd.print(opcoes[opcao]);

    bool aguardando = true;
    while (aguardando) {
      if (lerBotao(BTN_CIMA) || lerBotao(BTN_BAIXO)) {
        opcao = (opcao + 1) % 2;
        aguardando = false;
      } else if (lerBotao(BTN_GATILHO)) {
        return (opcao == 0);
      }
      delay(50);
    }
  }
}

/**
 * Exibe uma mensagem de 2 linhas.
 * Se aguardarGatilho=true, bloqueia até o usuário pressionar o gatilho.
 */
void exibirMensagem(const String& l1, const String& l2, bool aguardarGatilho) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(l1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(l2.substring(0, 16));

  if (aguardarGatilho) {
    while (!lerBotao(BTN_GATILHO)) {
      delay(50);
    }
  }
}

/**
 * M-2: Exibe uma mensagem de erro no LCD de forma legível.
 * Quebra o texto em linhas respeitando as palavras (não corta no meio).
 * Exibe "ERRO:" na primeira linha e o conteúdo na segunda.
 * Se a mensagem for longa, pagina automaticamente.
 * Aguarda o gatilho para voltar.
 */
void exibirErro(const String& msg) {
  // Primeira tela: "ERRO:" + até 16 chars da mensagem (quebrando por palavra)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("ERRO:");

  // Quebra a mensagem em pedaços de até 16 chars, respeitando palavras
  String restante = msg;
  int tela = 0;

  while (restante.length() > 0) {
    String linha;
    if (restante.length() <= 16) {
      linha = restante;
      restante = "";
    } else {
      // Encontra o último espaço dentro dos primeiros 16 caracteres
      int corte = 16;
      int ultimoEspaco = restante.lastIndexOf(' ', 15);
      if (ultimoEspaco > 0) {
        corte = ultimoEspaco;
      }
      linha = restante.substring(0, corte);
      restante = restante.substring(corte);
      restante.trim();
    }

    if (tela == 0) {
      // Primeira linha do erro: exibe na linha 1 (abaixo de "ERRO:")
      lcd.setCursor(0, 1);
      lcd.print(linha);
    } else {
      // Telas seguintes: exibe na linha 0 e 1
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(linha);
    }

    tela++;

    if (restante.length() == 0) {
      // Última tela — aguarda gatilho para sair
      break;
    } else {
      // Telas intermediárias — pausa para leitura
      delay(2500);
    }
  }

  // Aguarda gatilho para voltar ao menu
  // Se a mensagem coube em uma tela, o operador lê e pressiona
  // Se houve paginação, as telas intermediárias já passaram com delay
  while (!lerBotao(BTN_GATILHO)) {
    delay(50);
  }
}

/**
 * Lê um botão com debounce.
 * Retorna true apenas no flanco de descida (pressionou).
 */
bool lerBotao(int pino) {
  if (digitalRead(pino) == LOW) {
    delay(DEBOUNCE_MS);
    if (digitalRead(pino) == LOW) {
      while (digitalRead(pino) == LOW) delay(10); // aguarda soltar
      return true;
    }
  }
  return false;
}

// ══════════════════════════════════════════════════════════════
//  HELPERS RFID
// ══════════════════════════════════════════════════════════════

/**
 * I-2: Detecta e lê o UID de uma tag RFID atomicamente em uma única função.
 * Elimina a janela de race condition que existia entre aguardarTag() e lerEPC().
 *
 * Aguarda até RFID_READ_TIMEOUT ms. Retorna o EPC como string HEX maiúscula,
 * ou "" (string vazia) se nenhuma tag for detectada no prazo.
 */
String lerTagComTimeout() {
  unsigned long inicio = millis();
  while (millis() - inicio < RFID_READ_TIMEOUT) {
    // Detecta E lê o UID na mesma chamada — a tag está presente neste ponto
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
      // UID disponível: converte imediatamente para string HEX
      String epc = "";
      for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) epc += "0";
        epc += String(mfrc522.uid.uidByte[i], HEX);
      }
      epc.toUpperCase();

      // Coloca a tag em halt para não ser relida em sequência
      mfrc522.PICC_HaltA();

      Serial.print("[RFID] Tag lida: "); Serial.println(epc);
      return epc;
    }
    delay(100);
  }
  Serial.println("[RFID] Timeout — nenhuma tag detectada.");
  return "";
}

// ══════════════════════════════════════════════════════════════
//  COMUNICAÇÃO COM A API
// ══════════════════════════════════════════════════════════════

/**
 * M-1: Garante que o Wi-Fi está conectado antes de uma chamada HTTP.
 * Se desconectado, tenta reconectar até 3 vezes com feedback no LCD.
 * Retorna true se conseguiu conectar, false se falhou.
 */
bool garantirWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Reconectando...");
  Serial.println("[WiFi] Desconectado — tentando reconectar...");

  for (int tentativa = 1; tentativa <= 3; tentativa++) {
    lcd.setCursor(0, 1);
    lcd.print("Tentativa ");
    lcd.print(tentativa);
    lcd.print("/3  ");

    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int espera = 0;
    while (WiFi.status() != WL_CONNECTED && espera < 10) {
      delay(500);
      espera++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("[WiFi] Reconectado!");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("WiFi OK!");
      delay(800);
      return true;
    }
  }

  Serial.println("[WiFi] Falha ao reconectar apos 3 tentativas.");
  return false;
}

/**
 * Monta a URL base de um endpoint do dispositivo.
 */
String montarUrl(const String& endpoint) {
  return "http://" + String(API_HOST) + ":" + String(API_PORT) + "/api/rfid/dispositivo/" + endpoint;
}

/**
 * Adiciona os headers padrão da API ao HTTPClient.
 */
void adicionarHeaders(HTTPClient& http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Api-Key", RFID_API_KEY);
  http.setTimeout(TIMEOUT_HTTP);
}

// ─────────────────────────────────────────────────────────────
// POST /api/rfid/dispositivo/cadastrar
// ─────────────────────────────────────────────────────────────
bool apiCadastrar(const String& epc, const String& produto, int quantidade,
                  const String& setor, int lote, String& msgRetorno) {
  if (!garantirWiFi()) {
    msgRetorno = "Sem Wi-Fi";
    return false;
  }

  // Monta JSON
  StaticJsonDocument<256> doc;
  doc["epc"]       = epc;
  doc["produto"]   = produto;
  doc["quantidade"] = quantidade;
  doc["setor"]     = setor;
  doc["lote"]      = lote;
  String body;
  serializeJson(doc, body);

  Serial.print("[API] POST cadastrar: "); Serial.println(body);

  HTTPClient http;
  http.begin(montarUrl("cadastrar"));
  adicionarHeaders(http);
  int code = http.POST(body);

  if (code > 0) {
    String resp = http.getString();
    Serial.print("[API] "); Serial.print(code); Serial.print(" → "); Serial.println(resp);
    StaticJsonDocument<256> respDoc;
    deserializeJson(respDoc, resp);

    if (code == 201) {
      msgRetorno = respDoc["mensagem"] | "OK";
      http.end();
      return true;
    } else {
      msgRetorno = respDoc["erro"] | "Erro desconhecido";
      http.end();
      return false;
    }
  } else {
    msgRetorno = "Erro de rede";
    http.end();
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/rfid/dispositivo/consultar
// ─────────────────────────────────────────────────────────────
bool apiConsultar(const String& epc, DadosLeitura& dados, String& msgErro) {
  if (!garantirWiFi()) {
    msgErro = "Sem Wi-Fi";
    return false;
  }

  // C-6/M-5: 128 bytes é suficiente para {"epc":"..."}; margem de segurança acima dos ~40 mínimos
  StaticJsonDocument<128> doc;
  doc["epc"] = epc;
  String body;
  serializeJson(doc, body);

  Serial.print("[API] POST consultar: "); Serial.println(body);

  HTTPClient http;
  http.begin(montarUrl("consultar"));
  adicionarHeaders(http);
  int code = http.POST(body);

  if (code > 0) {
    String resp = http.getString();
    Serial.print("[API] "); Serial.print(code); Serial.print(" → "); Serial.println(resp);
    // C-6: 512 bytes para evitar descarte silencioso de campos com nomes longos
    StaticJsonDocument<512> respDoc;
    deserializeJson(respDoc, resp);

    if (code == 200) {
      dados.produto    = String(respDoc["produto"]    | "N/D");
      dados.quantidade = String((int)(respDoc["quantidade"] | 0));
      dados.setor      = String(respDoc["setor"]      | "N/D");
      dados.lote       = String(respDoc["lote"]       | "N/D");
      dados.situacao   = String(respDoc["situacao"]   | "N/D");
      http.end();
      return true;
    } else {
      msgErro = String(respDoc["erro"] | "Nao encontrado");
      http.end();
      return false;
    }
  } else {
    msgErro = "Erro de rede";
    http.end();
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/rfid/dispositivo/saida
// ─────────────────────────────────────────────────────────────
bool apiSaida(const String& epc, String& msgRetorno) {
  if (!garantirWiFi()) {
    msgRetorno = "Sem Wi-Fi";
    return false;
  }

  // M-5: 128 bytes para requisição com EPC (margem sobre os ~40 bytes mínimos)
  StaticJsonDocument<128> doc;
  doc["epc"] = epc;
  String body;
  serializeJson(doc, body);

  Serial.print("[API] POST saida: "); Serial.println(body);

  HTTPClient http;
  http.begin(montarUrl("saida"));
  adicionarHeaders(http);
  int code = http.POST(body);

  if (code > 0) {
    String resp = http.getString();
    Serial.print("[API] "); Serial.print(code); Serial.print(" → "); Serial.println(resp);
    StaticJsonDocument<256> respDoc;
    deserializeJson(respDoc, resp);

    if (code == 200) {
      msgRetorno = respDoc["mensagem"] | "OK";
      http.end();
      return true;
    } else {
      msgRetorno = String(respDoc["erro"] | "Erro desconhecido");
      http.end();
      return false;
    }
  } else {
    msgRetorno = "Erro de rede";
    http.end();
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/rfid/dispositivo/excluir
// ─────────────────────────────────────────────────────────────
bool apiExcluir(const String& epc, String& msgRetorno) {
  if (!garantirWiFi()) {
    msgRetorno = "Sem Wi-Fi";
    return false;
  }

  // M-5: 128 bytes para requisição com EPC (margem sobre os ~40 bytes mínimos)
  StaticJsonDocument<128> doc;
  doc["epc"] = epc;
  String body;
  serializeJson(doc, body);

  Serial.print("[API] DELETE excluir: "); Serial.println(body);

  HTTPClient http;
  http.begin(montarUrl("excluir"));
  adicionarHeaders(http);
  // DELETE com body
  http.addHeader("Content-Length", String(body.length()));
  int code = http.sendRequest("DELETE", body);

  if (code > 0) {
    String resp = http.getString();
    Serial.print("[API] "); Serial.print(code); Serial.print(" → "); Serial.println(resp);
    StaticJsonDocument<256> respDoc;
    deserializeJson(respDoc, resp);

    if (code == 200) {
      msgRetorno = respDoc["mensagem"] | "OK";
      http.end();
      return true;
    } else {
      msgRetorno = String(respDoc["erro"] | "Erro desconhecido");
      http.end();
      return false;
    }
  } else {
    msgRetorno = "Erro de rede";
    http.end();
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
//  WI-FI
// ══════════════════════════════════════════════════════════════

void conectarWiFi() {
  Serial.print("Conectando ao Wi-Fi '");
  Serial.print(WIFI_SSID);
  Serial.print("'");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Conectando WiFi");

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" OK!");
    Serial.print("IP: "); Serial.println(WiFi.localIP());
    lcd.setCursor(0, 1);
    lcd.print("IP: ");
    lcd.print(WiFi.localIP());
    delay(1500);
  } else {
    Serial.println("\nFalha no Wi-Fi!");
    lcd.setCursor(0, 1);
    lcd.print("FALHA no WiFi!");
    delay(2000);
    // Continua sem Wi-Fi; erros serão tratados nas chamadas da API
  }
}
