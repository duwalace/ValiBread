/**
 * ValiBread — Firmware ESP32 para Leitura de Tags RFID
 * =====================================================
 * Bibliotecas necessárias (já instaladas):
 *   - MFRC522  (by miguelbalboa)
 *   - WiFi     (built-in no ESP32 Core)
 *   - HTTPClient (built-in no ESP32 Core)
 *
 * Pinagem MFRC522 → ESP32:
 *   SDA (SS)  → pino 5
 *   SCK       → pino 18
 *   MOSI      → pino 23
 *   MISO      → pino 19
 *   RST       → pino 27
 *   GND       → GND
 *   3.3V      → 3.3V  (NUNCA ligue em 5V)
 *
 * ── O QUE VOCÊ PRECISA ALTERAR ANTES DE GRAVAR ────────────────
 *   1. WIFI_SSID      → nome da sua rede Wi-Fi
 *   2. WIFI_PASSWORD  → senha da sua rede Wi-Fi
 *   3. API_HOST       → IP do computador onde o backend roda
 *                       (ex: 192.168.1.105)
 *   4. RFID_API_KEY   → mesmo valor de RFID_API_KEY no arquivo backend/.env
 *   5. ID_LEITOR      → id_leitor cadastrado no banco (tabela leitor_rfid)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// ════════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURAÇÕES — edite apenas esta seção
// ════════════════════════════════════════════════════════════════

const char* WIFI_SSID     = "SEU_WIFI_SSID";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";

// IP LOCAL do computador onde o backend Node.js está rodando
// Descubra rodando: ipconfig (Windows) ou ifconfig (Linux/Mac)
const char* API_HOST      = "192.168.1.100";
const int   API_PORT      = 3000;

// Mesmo valor que RFID_API_KEY no arquivo backend/.env
const char* RFID_API_KEY  = "chave_segura_para_o_hardware_rfid";

// ID do leitor cadastrado no banco (tabela leitor_rfid)
const int   ID_LEITOR     = 1;

// ════════════════════════════════════════════════════════════════
//  Pinos — ajuste se usar pinagem diferente
// ════════════════════════════════════════════════════════════════

#define SS_PIN   5   // SDA / CS do MFRC522
#define RST_PIN  27  // RST do MFRC522
#define LED_PIN  2   // LED embutido do ESP32

// ════════════════════════════════════════════════════════════════
//  Constantes de comportamento
// ════════════════════════════════════════════════════════════════

// Tempo mínimo (ms) antes de reler a MESMA tag
const unsigned long DEBOUNCE_MS  = 2500;

// Timeout para a requisição HTTP
const int           TIMEOUT_HTTP = 8000;

// ════════════════════════════════════════════════════════════════
//  Variáveis globais
// ════════════════════════════════════════════════════════════════

MFRC522 rfid(SS_PIN, RST_PIN);
String  ultimoEPC     = "";
unsigned long ultimaLeitura = 0;

// ════════════════════════════════════════════════════════════════
//  setup()
// ════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println("╔═══════════════════════════════╗");
  Serial.println("║   ValiBread  RFID Scanner     ║");
  Serial.println("╚═══════════════════════════════╝");

  // LED de feedback
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Inicializa barramento SPI e módulo RFID
  SPI.begin();
  rfid.PCD_Init();
  delay(50);

  Serial.print("MFRC522 versao: ");
  rfid.PCD_DumpVersionToSerial();

  // Conecta ao Wi-Fi
  conectarWiFi();

  Serial.println("\n>> Pronto. Aproxime uma tag ao leitor <<\n");
  piscarLED(3, 100); // 3 piscadas = inicializado com sucesso
}

// ════════════════════════════════════════════════════════════════
//  loop()
// ════════════════════════════════════════════════════════════════

void loop() {
  // Aguarda nova tag
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial())   return;

  // Converte UID para string hexadecimal (ex: "A3F20C1B")
  String epc = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) epc += "0";
    epc += String(rfid.uid.uidByte[i], HEX);
  }
  epc.toUpperCase();

  // Encerra comunicação com a tag imediatamente
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  if (epc.length() == 0) return;

  // Debounce: mesma tag não é reenviada antes do tempo mínimo
  unsigned long agora = millis();
  if (epc == ultimoEPC && (agora - ultimaLeitura) < DEBOUNCE_MS) {
    Serial.print("[debounce] Tag ignorada: ");
    Serial.println(epc);
    return;
  }

  ultimoEPC     = epc;
  ultimaLeitura = agora;

  Serial.println("─────────────────────────────────");
  Serial.print("Tag lida: ");
  Serial.println(epc);

  // Garante Wi-Fi ativo
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi caiu. Reconectando...");
    conectarWiFi();
  }

  // Envia para a API e pisca LED conforme resultado
  if (enviarParaAPI(epc)) {
    piscarLED(2, 100); // sucesso: 2 piscadas rapidas
  } else {
    piscarLED(5, 60);  // erro:    5 piscadas rapidas
  }
}

// ════════════════════════════════════════════════════════════════
//  Envia EPC para POST /api/rfid/scan
// ════════════════════════════════════════════════════════════════

bool enviarParaAPI(const String& epc) {
  String url = "http://";
  url += API_HOST;
  url += ":";
  url += String(API_PORT);
  url += "/api/rfid/scan";

  // Monta JSON manualmente (sem ArduinoJson)
  // {"epc":"AABBCCDD","id_leitor":1,"rssi":-65}
  String body = "{\"epc\":\"";
  body += epc;
  body += "\",\"id_leitor\":";
  body += String(ID_LEITOR);
  body += ",\"rssi\":";
  body += String(WiFi.RSSI());
  body += "}";

  Serial.print("Enviando para: ");
  Serial.println(url);
  Serial.print("Payload: ");
  Serial.println(body);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Api-Key", RFID_API_KEY);
  http.setTimeout(TIMEOUT_HTTP);

  int httpCode = http.POST(body);

  if (httpCode > 0) {
    String resposta = http.getString();
    Serial.print("HTTP ");
    Serial.print(httpCode);
    Serial.print(" -> ");
    Serial.println(resposta);
    http.end();
    return (httpCode == 200 || httpCode == 201);
  } else {
    Serial.print("Erro HTTP: ");
    Serial.println(http.errorToString(httpCode));
    http.end();
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
//  Conecta ao Wi-Fi (bloqueia ate conectar ou atingir timeout)
// ════════════════════════════════════════════════════════════════

void conectarWiFi() {
  Serial.print("Conectando ao Wi-Fi '");
  Serial.print(WIFI_SSID);
  Serial.print("'");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" OK!");
    Serial.print("IP do ESP32: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFalha no Wi-Fi! Verifique SSID e senha.");
  }
}

// ════════════════════════════════════════════════════════════════
//  Pisca o LED N vezes
// ════════════════════════════════════════════════════════════════

void piscarLED(int vezes, int ms) {
  for (int i = 0; i < vezes; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(ms);
    digitalWrite(LED_PIN, LOW);
    delay(ms);
  }
}
