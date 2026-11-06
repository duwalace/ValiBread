/**
 * ValiBread — Firmware ESP32 com Leitor RFID-RC522 (3 Modos de Operação)
 * ======================================================================
 * Projeto adaptado para simulação no Wokwi.
 *
 * Componentes:
 *   - ESP32 DevKit C V4
 *   - RFID-RC522 (MFRC522)
 *   - HW-131 (fonte de alimentação — representado pela alimentação 3.3V/5V)
 *   - LCD Keypad Shield (simulado com LCD I2C + 5 push buttons)
 *
 * ══════════════════════════════════════════════════════════
 *  TRÊS MODOS DE OPERAÇÃO DO LEITOR RFID
 * ══════════════════════════════════════════════════════════
 *
 *  MODO 1 — LEITURA (Padrão)
 *    Lê tags RFID e exibe UID no LCD e Serial.
 *    Envia dados para a API (se Wi-Fi conectado).
 *
 *  MODO 2 — ESCRITA
 *    Permite gravar dados em um bloco da tag RFID.
 *    O usuário seleciona dados pré-definidos pelo menu.
 *
 *  MODO 3 — AUTENTICAÇÃO / VALIDAÇÃO
 *    Compara a tag lida com uma lista de tags autorizadas.
 *    Feedback visual (LED verde/vermelho) e sonoro (buzzer).
 *
 * ══════════════════════════════════════════════════════════
 *  SIMULAÇÃO DO LCD KEYPAD SHIELD (Wokwi)
 * ══════════════════════════════════════════════════════════
 *  O LCD Keypad Shield não existe no Wokwi, então usamos:
 *   - LCD 16x2 I2C (endereço 0x27)
 *   - 5 push buttons: RIGHT, UP, DOWN, LEFT, SELECT
 *   - Cada botão em um pino digital com INPUT_PULLUP
 *
 *  Mapeamento dos botões → navegação no menu:
 *   RIGHT  → Confirmar / Entrar
 *   UP     → Navegar para cima / Incrementar
 *   DOWN   → Navegar para baixo / Decrementar
 *   LEFT   → Voltar / Cancelar
 *   SELECT → Alternar modo de operação
 *
 * ══════════════════════════════════════════════════════════
 *  PINAGEM
 * ══════════════════════════════════════════════════════════
 *
 *  MFRC522 → ESP32:
 *    SDA (SS)  → GPIO 5
 *    SCK       → GPIO 18
 *    MOSI      → GPIO 23
 *    MISO      → GPIO 19
 *    RST       → GPIO 27
 *    3.3V      → 3.3V
 *    GND       → GND
 *
 *  LCD I2C → ESP32:
 *    SDA       → GPIO 21
 *    SCL       → GPIO 22
 *    VCC       → 3.3V
 *    GND       → GND
 *
 *  Botões (INPUT_PULLUP, ativo LOW):
 *    RIGHT     → GPIO 32
 *    UP        → GPIO 33
 *    DOWN      → GPIO 25
 *    LEFT      → GPIO 26
 *    SELECT    → GPIO 14
 *
 *  LEDs:
 *    LED Verde (OK)   → GPIO 4  (com resistor 220Ω)
 *    LED Vermelho (ERR)→ GPIO 16 (com resistor 220Ω)
 *
 *  Buzzer:
 *    Sinal     → GPIO 17
 *
 *  HW-131:
 *    Fornece alimentação regulada 3.3V/5V ao circuito.
 *    No Wokwi, a alimentação vem diretamente do ESP32.
 */

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ════════════════════════════════════════════════════════════════
//  Modo Simulação Wokwi
//  O Wokwi não suporta MIFARE_Write() completamente.
//  Com esta flag ativa, o modo ESCRITA simula a gravação
//  (lê o bloco para validar a autenticação e exibe o dado
//   que SERIA gravado). Em hardware real, descomente a linha.
// ════════════════════════════════════════════════════════════════
#define WOKWI_SIM  // Comente esta linha ao gravar no ESP32 real

// ════════════════════════════════════════════════════════════════
//  Pinos — MFRC522
// ════════════════════════════════════════════════════════════════
#define SS_PIN    5
#define RST_PIN   27

// ════════════════════════════════════════════════════════════════
//  Pinos — Botões (simulando LCD Keypad Shield)
// ════════════════════════════════════════════════════════════════
#define BTN_RIGHT   32
#define BTN_UP      33
#define BTN_DOWN    25
#define BTN_LEFT    26
#define BTN_SELECT  14

// ════════════════════════════════════════════════════════════════
//  Pinos — LEDs e Buzzer
// ════════════════════════════════════════════════════════════════
#define LED_GREEN   4
#define LED_RED     16
#define BUZZER_PIN  17

// ════════════════════════════════════════════════════════════════
//  Constantes
// ════════════════════════════════════════════════════════════════
#define DEBOUNCE_BTN_MS   250
#define DEBOUNCE_RFID_MS  2500
#define NUM_TAGS_AUTH     5
#define LCD_COLS          16
#define LCD_ROWS          2
#define BEEP_FREQ         2000

// ════════════════════════════════════════════════════════════════
//  Enumerações
// ════════════════════════════════════════════════════════════════

enum ModoOperacao {
  MODO_LEITURA = 0,
  MODO_ESCRITA,
  MODO_AUTENTICACAO,
  NUM_MODOS
};

const char* NOMES_MODO[] = {
  "LEITURA",
  "ESCRITA",
  "AUTENTICACAO"
};

// Dados pré-definidos para gravação (Modo Escrita)
const char* DADOS_ESCRITA[] = {
  "ValiBread-Prod01",
  "ValiBread-Prod02",
  "ValiBread-Prod03",
  "ValiBread-Lote01",
  "ValiBread-Lote02"
};
const int NUM_DADOS_ESCRITA = 5;

// Tags autorizadas (Modo Autenticação) — UIDs em hex maiúsculo
// No Wokwi, as tags simuladas geram UIDs como "AABBCCDD"
String tagsAutorizadas[NUM_TAGS_AUTH] = {
  "AABBCCDD",
  "11223344",
  "DEADBEEF",
  "CAFEBABE",
  "01020304"
};

// ════════════════════════════════════════════════════════════════
//  Objetos globais
// ════════════════════════════════════════════════════════════════

MFRC522 rfid(SS_PIN, RST_PIN);
MFRC522::MIFARE_Key chave;
LiquidCrystal_I2C lcd(0x27, LCD_COLS, LCD_ROWS);

// ════════════════════════════════════════════════════════════════
//  Variáveis de estado
// ════════════════════════════════════════════════════════════════

ModoOperacao modoAtual       = MODO_LEITURA;
int          menuIndex       = 0;          // Índice do menu de escrita
String       ultimoUID       = "";
unsigned long ultimaLeitura  = 0;
unsigned long ultimoBtnPress = 0;
bool         menuAtivo       = false;
int          totalLeituras   = 0;
int          totalEscritas   = 0;
int          totalAutenticOK = 0;
int          totalAutenticFail = 0;

// Caracteres customizados LCD
byte charCadeado[8]  = {0x0E, 0x11, 0x11, 0x1F, 0x1B, 0x1B, 0x1F, 0x00};
byte charCheck[8]    = {0x00, 0x01, 0x03, 0x16, 0x1C, 0x08, 0x00, 0x00};
byte charX[8]        = {0x00, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x00, 0x00};
byte charAntena[8]   = {0x04, 0x0E, 0x15, 0x04, 0x04, 0x04, 0x04, 0x00};
byte charEscrita[8]  = {0x01, 0x03, 0x05, 0x09, 0x12, 0x14, 0x18, 0x10};

// ════════════════════════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║  ValiBread RFID — 3 Modos de Operacao  ║");
  Serial.println("╚════════════════════════════════════════╝");

  // Pinos de saída
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  // Botões com pull-up interno
  pinMode(BTN_RIGHT, INPUT_PULLUP);
  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_DOWN, INPUT_PULLUP);
  pinMode(BTN_LEFT, INPUT_PULLUP);
  pinMode(BTN_SELECT, INPUT_PULLUP);

  // Inicializa LCD I2C
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, charCadeado);
  lcd.createChar(1, charCheck);
  lcd.createChar(2, charX);
  lcd.createChar(3, charAntena);
  lcd.createChar(4, charEscrita);

  // Tela de splash
  lcd.setCursor(0, 0);
  lcd.print("  ValiBread ");
  lcd.write(3); // ícone antena
  lcd.setCursor(0, 1);
  lcd.print(" RFID  Scanner  ");
  delay(1500);

  // Inicializa SPI e RFID
  SPI.begin();
  rfid.PCD_Init();
  delay(50);

  // Prepara chave padrão MIFARE (0xFF x 6)
  for (byte i = 0; i < 6; i++) {
    chave.keyByte[i] = 0xFF;
  }

  Serial.print("MFRC522 versao: ");
  rfid.PCD_DumpVersionToSerial();
  Serial.println();

  // Feedback de inicialização
  beepOK();
  ledVerdePulso(3, 100);

  Serial.println(">> Sistema pronto! Use SELECT para trocar de modo.");
  Serial.println(">> Modos: LEITURA | ESCRITA | AUTENTICACAO");
  Serial.println();

  exibirTelaInicial();
}

// ════════════════════════════════════════════════════════════════
//  LOOP PRINCIPAL
// ════════════════════════════════════════════════════════════════

void loop() {
  // Processa botões
  processarBotoes();

  // Executa lógica do modo atual
  switch (modoAtual) {
    case MODO_LEITURA:
      loopLeitura();
      break;
    case MODO_ESCRITA:
      loopEscrita();
      break;
    case MODO_AUTENTICACAO:
      loopAutenticacao();
      break;
  }

  delay(50); // Pequeno delay para estabilidade
}

// ════════════════════════════════════════════════════════════════
//  PROCESSAMENTO DE BOTÕES
// ════════════════════════════════════════════════════════════════

void processarBotoes() {
  unsigned long agora = millis();
  if ((agora - ultimoBtnPress) < DEBOUNCE_BTN_MS) return;

  if (digitalRead(BTN_SELECT) == LOW) {
    ultimoBtnPress = agora;
    trocarModo();
  }
  else if (digitalRead(BTN_UP) == LOW) {
    ultimoBtnPress = agora;
    onBotaoUp();
  }
  else if (digitalRead(BTN_DOWN) == LOW) {
    ultimoBtnPress = agora;
    onBotaoDown();
  }
  else if (digitalRead(BTN_RIGHT) == LOW) {
    ultimoBtnPress = agora;
    onBotaoRight();
  }
  else if (digitalRead(BTN_LEFT) == LOW) {
    ultimoBtnPress = agora;
    onBotaoLeft();
  }
}

void trocarModo() {
  modoAtual = (ModoOperacao)((modoAtual + 1) % NUM_MODOS);
  menuAtivo = false;
  menuIndex = 0;

  Serial.print("\n>> Modo alterado para: ");
  Serial.println(NOMES_MODO[modoAtual]);

  beepCurto();
  exibirTelaInicial();
}

void onBotaoUp() {
  if (modoAtual == MODO_ESCRITA && menuAtivo) {
    menuIndex = (menuIndex - 1 + NUM_DADOS_ESCRITA) % NUM_DADOS_ESCRITA;
    exibirMenuEscrita();
  }
  Serial.println("[BTN] UP");
}

void onBotaoDown() {
  if (modoAtual == MODO_ESCRITA && menuAtivo) {
    menuIndex = (menuIndex + 1) % NUM_DADOS_ESCRITA;
    exibirMenuEscrita();
  }
  Serial.println("[BTN] DOWN");
}

void onBotaoRight() {
  if (modoAtual == MODO_ESCRITA) {
    if (!menuAtivo) {
      menuAtivo = true;
      menuIndex = 0;
      exibirMenuEscrita();
    } else {
      // Confirmar seleção — aguardando tag
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.write(4); // ícone escrita
      lcd.print(" Aproxime tag");
      lcd.setCursor(0, 1);
      lcd.print("p/ gravar dados");
      Serial.print("[ESCRITA] Dado selecionado: ");
      Serial.println(DADOS_ESCRITA[menuIndex]);
    }
  }
  Serial.println("[BTN] RIGHT (confirmar)");
}

void onBotaoLeft() {
  if (menuAtivo) {
    menuAtivo = false;
    exibirTelaInicial();
  }
  Serial.println("[BTN] LEFT (voltar)");
}

// ════════════════════════════════════════════════════════════════
//  MODO 1 — LEITURA
// ════════════════════════════════════════════════════════════════

void loopLeitura() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial())   return;

  String uid = obterUID();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (uid.length() == 0) return;

  // Debounce de releitura
  unsigned long agora = millis();
  if (uid == ultimoUID && (agora - ultimaLeitura) < DEBOUNCE_RFID_MS) {
    return;
  }
  ultimoUID     = uid;
  ultimaLeitura = agora;
  totalLeituras++;

  // Identifica o tipo da tag
  MFRC522::PICC_Type tipoTag = rfid.PICC_GetType(rfid.uid.sak);
  String nomeTipo = rfid.PICC_GetTypeName(tipoTag);

  // Exibe no Serial
  Serial.println("═══════════════════════════════════════");
  Serial.println("[MODO LEITURA]");
  Serial.print("  UID:  ");
  Serial.println(uid);
  Serial.print("  Tipo: ");
  Serial.println(nomeTipo);
  Serial.print("  Total leituras: ");
  Serial.println(totalLeituras);
  Serial.println("═══════════════════════════════════════");

  // Exibe no LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(3); // ícone antena
  lcd.print("UID:");
  lcd.print(uid);
  lcd.setCursor(0, 1);
  lcd.print("Leit#");
  lcd.print(totalLeituras);
  lcd.print(" ");
  lcd.print(nomeTipo.substring(0, 7));

  // Feedback visual/sonoro
  ledVerdePulso(2, 100);
  beepOK();
}

// ════════════════════════════════════════════════════════════════
//  MODO 2 — ESCRITA
// ════════════════════════════════════════════════════════════════
//
//  NOTA: O simulador Wokwi NÃO suporta MIFARE_Write().
//  Com #define WOKWI_SIM, o modo Escrita autentica e faz uma
//  leitura do bloco para comprovar que a comunicação funciona,
//  e então exibe o dado que SERIA gravado.
//  Em hardware real, remova #define WOKWI_SIM para usar a
//  gravação de verdade via MIFARE_Write().
// ════════════════════════════════════════════════════════════════

void loopEscrita() {
  // Só tenta escrever se o menu estiver ativo e um dado foi selecionado
  if (!menuAtivo) return;

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial())   return;

  String uid = obterUID();

  // Identifica tipo da tag
  MFRC522::PICC_Type tipoTag = rfid.PICC_GetType(rfid.uid.sak);

  Serial.println("═══════════════════════════════════════");
  Serial.println("[MODO ESCRITA]");
  Serial.print("  Tag detectada — UID: ");
  Serial.println(uid);
  Serial.print("  Tipo: ");
  Serial.println(rfid.PICC_GetTypeName(tipoTag));

  String dadoSelecionado = DADOS_ESCRITA[menuIndex];
  byte bloco = 4; // Setor 1, bloco 0

  // Autentica no bloco com chave padrão
  MFRC522::StatusCode status;
  status = rfid.PCD_Authenticate(
    MFRC522::PICC_CMD_MF_AUTH_KEY_A, bloco, &chave, &(rfid.uid)
  );

  if (status != MFRC522::STATUS_OK) {
    Serial.print("  ERRO autenticacao: ");
    Serial.println(rfid.GetStatusCodeName(status));

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(2); // ícone X
    lcd.print(" Erro Escrita");
    lcd.setCursor(0, 1);
    lcd.print("Auth falhou!");

    ledVermelhaPulso(3, 100);
    beepErro();

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }

  Serial.println("  Autenticacao OK no bloco 4");

#ifdef WOKWI_SIM
  // ── Fallback para simulação Wokwi ──────────────────────────
  // O Wokwi NÃO suporta MIFARE_Write() nem MIFARE_Read() com
  // CRC correto. Porém a autenticação no bloco funcionou, o que
  // comprova que a comunicação SPI e o protocolo MIFARE estão OK.
  // Simulamos o sucesso da gravação com base na autenticação.

  totalEscritas++;
  Serial.println("  [WOKWI] Autenticacao validada com sucesso!");
  Serial.print("  [WOKWI] Dado que seria gravado no bloco ");
  Serial.print(bloco);
  Serial.print(": ");
  Serial.println(dadoSelecionado);
  Serial.println("  [WOKWI] (Write/Read nao suportados no simulador)");
  Serial.print("  Total operacoes de escrita: ");
  Serial.println(totalEscritas);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.write(1); // ícone check
  lcd.print(" Gravado OK!");
  lcd.setCursor(0, 1);
  lcd.print(dadoSelecionado.substring(0, 16));

  ledVerdePulso(3, 100);
  beepOK();

#else
  // ── Gravação real (hardware físico) ────────────────────────
  byte writeBuffer[16];
  memset(writeBuffer, 0, 16);
  for (int i = 0; i < 16 && i < (int)dadoSelecionado.length(); i++) {
    writeBuffer[i] = dadoSelecionado[i];
  }

  status = rfid.MIFARE_Write(bloco, writeBuffer, 16);

  if (status == MFRC522::STATUS_OK) {
    totalEscritas++;
    Serial.print("  ESCRITA OK! Dado: ");
    Serial.println(dadoSelecionado);
    Serial.print("  Bloco: ");
    Serial.println(bloco);
    Serial.print("  Total escritas: ");
    Serial.println(totalEscritas);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(1); // ícone check
    lcd.print(" Gravado OK!");
    lcd.setCursor(0, 1);
    lcd.print(dadoSelecionado.substring(0, 16));

    ledVerdePulso(3, 100);
    beepOK();
  } else {
    Serial.print("  ERRO escrita: ");
    Serial.println(rfid.GetStatusCodeName(status));

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(2); // ícone X
    lcd.print(" Erro Escrita");
    lcd.setCursor(0, 1);
    lcd.print(rfid.GetStatusCodeName(status));

    ledVermelhaPulso(5, 60);
    beepErro();
  }
#endif

  Serial.println("═══════════════════════════════════════");

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // Volta para o menu após gravação
  delay(1500);
  exibirMenuEscrita();
}

// ════════════════════════════════════════════════════════════════
//  MODO 3 — AUTENTICAÇÃO / VALIDAÇÃO
// ════════════════════════════════════════════════════════════════

void loopAutenticacao() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial())   return;

  String uid = obterUID();
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (uid.length() == 0) return;

  // Debounce
  unsigned long agora = millis();
  if (uid == ultimoUID && (agora - ultimaLeitura) < DEBOUNCE_RFID_MS) {
    return;
  }
  ultimoUID     = uid;
  ultimaLeitura = agora;

  // Verifica se a tag está na lista de autorizadas
  bool autorizado = false;
  for (int i = 0; i < NUM_TAGS_AUTH; i++) {
    if (uid == tagsAutorizadas[i]) {
      autorizado = true;
      break;
    }
  }

  Serial.println("═══════════════════════════════════════");
  Serial.println("[MODO AUTENTICACAO]");
  Serial.print("  UID: ");
  Serial.println(uid);

  if (autorizado) {
    totalAutenticOK++;
    Serial.println("  >>> ACESSO AUTORIZADO <<<");
    Serial.print("  Total autorizados: ");
    Serial.println(totalAutenticOK);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(1); // ícone check
    lcd.print(" AUTORIZADO!");
    lcd.setCursor(0, 1);
    lcd.print(uid);

    ledVerdePulso(3, 150);
    beepOK();

  } else {
    totalAutenticFail++;
    Serial.println("  >>> ACESSO NEGADO <<<");
    Serial.print("  Total negados: ");
    Serial.println(totalAutenticFail);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.write(0); // ícone cadeado
    lcd.print(" ACESSO NEGADO");
    lcd.setCursor(0, 1);
    lcd.print(uid);

    ledVermelhaPulso(5, 80);
    beepErro();
  }

  Serial.println("═══════════════════════════════════════");

  // Após 2 segundos, volta à tela de espera
  delay(2000);
  exibirTelaInicial();
}

// ════════════════════════════════════════════════════════════════
//  FUNÇÕES DE DISPLAY
// ════════════════════════════════════════════════════════════════

void exibirTelaInicial() {
  lcd.clear();
  lcd.setCursor(0, 0);

  switch (modoAtual) {
    case MODO_LEITURA:
      lcd.write(3); // antena
      lcd.print(" M1:LEITURA");
      lcd.setCursor(0, 1);
      lcd.print("Aproxime a tag..");
      break;

    case MODO_ESCRITA:
      lcd.write(4); // escrita
      lcd.print(" M2:ESCRITA");
      lcd.setCursor(0, 1);
      lcd.print("RIGHT=Menu dados");
      break;

    case MODO_AUTENTICACAO:
      lcd.write(0); // cadeado
      lcd.print(" M3:AUTENTIC.");
      lcd.setCursor(0, 1);
      lcd.print("Aproxime a tag..");
      break;
  }
}

void exibirMenuEscrita() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Dado[");
  lcd.print(menuIndex + 1);
  lcd.print("/");
  lcd.print(NUM_DADOS_ESCRITA);
  lcd.print("]:");
  lcd.setCursor(0, 1);
  String dado = DADOS_ESCRITA[menuIndex];
  lcd.print(dado.substring(0, 16));
}

// ════════════════════════════════════════════════════════════════
//  FUNÇÕES AUXILIARES — RFID
// ════════════════════════════════════════════════════════════════

String obterUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ════════════════════════════════════════════════════════════════
//  FUNÇÕES AUXILIARES — LED e BUZZER
// ════════════════════════════════════════════════════════════════

void ledVerdePulso(int vezes, int ms) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(LED_GREEN, HIGH);
    delay(ms);
    digitalWrite(LED_GREEN, LOW);
    delay(ms);
  }
}

void ledVermelhaPulso(int vezes, int ms) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(LED_RED, HIGH);
    delay(ms);
    digitalWrite(LED_RED, LOW);
    delay(ms);
  }
}

void beepOK() {
  // Dois bipes curtos (tom alto)
  tone(BUZZER_PIN, BEEP_FREQ, 100);
  delay(150);
  tone(BUZZER_PIN, BEEP_FREQ + 500, 100);
  delay(150);
  noTone(BUZZER_PIN);
}

void beepErro() {
  // Três bipes graves
  for (int i = 0; i < 3; i++) {
    tone(BUZZER_PIN, 800, 100);
    delay(150);
  }
  noTone(BUZZER_PIN);
}

void beepCurto() {
  tone(BUZZER_PIN, 1500, 50);
  delay(80);
  noTone(BUZZER_PIN);
}

