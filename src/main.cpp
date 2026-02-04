#include <Arduino.h>
#include <LittleFS.h>
#include <ESP8266WiFi.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>

#include "MotorController.h"
#include "WiFiManager.h"
#include "WebServerManager.h"
#include "AudioManager.h"

// Pin Tanımlamaları - TB6612FNG için
#define PWMA D1  // GPIO5 - Sol motor PWM
#define AIN1 D2  // GPIO4 - Sol motor IN1
#define AIN2 D3  // GPIO0 - Sol motor IN2

#define PWMB D7  // GPIO13 - Sağ motor PWM (D5 boşaltıldı)
#define BIN1 D0  // GPIO16 - Sağ motor IN1 (D6 boşaltıldı)
#define BIN2 D8  // GPIO15 - Sağ motor IN2

#define STBY D4  // GPIO2 - Standby pin

// DFPlayer Pinleri
#define DFPLAYER_RX D5  // ESP RX (DFPlayer TX)
#define DFPLAYER_TX D6  // ESP TX (DFPlayer RX)

// Global nesneler
MotorController* motor;
WiFiManager* wifi;
WebServerManager* webServer;
AudioManager* audio;

void setupOTA() {
    // OTA (Over-The-Air) Güncelleme Ayarları
    ArduinoOTA.setHostname("rc-otonomous-car");
    ArduinoOTA.setPassword("admin123"); // OTA şifresi
    
    ArduinoOTA.onStart([]() {
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH) {
            type = "sketch";
        } else { // U_SPIFFS
            type = "filesystem";
            LittleFS.end();
        }
        Serial.println("OTA Güncelleme Başladı: " + type);
        motor->stop(); // Güvenlik için motorları durdur
    });
    
    ArduinoOTA.onEnd([]() {
        Serial.println("\nOTA Güncelleme Tamamlandı!");
    });
    
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("OTA İlerleme: %u%%\r", (progress * 100) / total);
    });
    
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("OTA Hatası[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Yetkilendirme Hatası");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Başlatma Hatası");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Bağlantı Hatası");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Alma Hatası");
        else if (error == OTA_END_ERROR) Serial.println("Bitirme Hatası");
    });
    
    ArduinoOTA.begin();
    Serial.println("OTA Güncelleme Hazır");
    Serial.print("OTA Hostname: rc-otonomous-car.local veya ");
    Serial.println(WiFi.localIP());
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("\n=================================");
    Serial.println("   RC Araba Kontrol Sistemi");
    Serial.println("=================================");
    
    // Motor kontrolörü oluştur
    motor = new MotorController(PWMA, AIN1, AIN2, PWMB, BIN1, BIN2, STBY);
    motor->begin();
    motor->setSpeed(150); // Varsayılan hız

    // DFPlayer başlat
    audio = new AudioManager(DFPLAYER_RX, DFPLAYER_TX);
    audio->begin();
    
    // WiFi başlat
    wifi = new WiFiManager();
    wifi->begin();
    
    // SPIFFS (LittleFS) başlat
    if (!LittleFS.begin()) {
        Serial.println("LittleFS başlatılamadı!");
        // Hata durumunda formatla (dikkatli olun!)
        // LittleFS.format();
        // LittleFS.begin();
    } else {
        Serial.println("LittleFS başlatıldı");
        
        // Dosya sistemini listele (debug için)
        Dir dir = LittleFS.openDir("/");
        while (dir.next()) {
            Serial.print("  ");
            Serial.print(dir.fileName());
            Serial.print(" - ");
            Serial.print(dir.fileSize());
            Serial.println(" bytes");
        }
    }
    
    // OTA'yı kur
    setupOTA();
    
    // Web server başlat
    webServer = new WebServerManager(motor, audio);
    webServer->begin();
    
    Serial.println("\nSistem Hazır!");
    Serial.print("Bağlanmak için: ");
    Serial.print("http://");
    Serial.println(wifi->getIPAddress());
    Serial.println("WebSocket Port: 81");
    Serial.println("=================================\n");
}

void loop() {
    webServer->loop();
    ArduinoOTA.handle(); // OTA'yı handle et
    
    // 30 saniyede bir bağlantı durumunu kontrol et
    static unsigned long lastCheck = 0;
    if (millis() - lastCheck > 30000) {
        lastCheck = millis();
        
        if (!wifi->isConnected()) {
            Serial.println("WiFi bağlantısı kesildi! Yeniden bağlanılıyor...");
            wifi->begin();
        }
    }
    
    delay(10); // CPU kullanımını azalt
}