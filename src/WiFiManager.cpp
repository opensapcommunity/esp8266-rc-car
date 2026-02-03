#include "WiFiManager.h"

void WiFiManager::begin() {
    Serial.begin(115200);
    Serial.println("\n\nRC Araba Başlatılıyor...");
    
    if (apMode) {
        // Access Point modu
        Serial.println("Access Point modu başlatılıyor...");
        WiFi.softAP(ssid, password);
        
        Serial.print("AP SSID: ");
        Serial.println(ssid);
        Serial.print("AP IP Adresi: ");
        Serial.println(WiFi.softAPIP());
    } else {
        // Station modu (ev WiFi'sine bağlan)
        Serial.println("Station modu başlatılıyor...");
        WiFi.begin(ssid, password);
        
        Serial.print("WiFi'ye bağlanıyor: ");
        Serial.println(ssid);
        
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            Serial.print(".");
            attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("\nWiFi'ye bağlandı!");
            Serial.print("IP Adresi: ");
            Serial.println(WiFi.localIP());
        } else {
            Serial.println("\nWiFi bağlantısı başarısız! AP moduna geçiliyor...");
            apMode = true;
            WiFi.softAP("RC_Araba_AP", "12345678");
        }
    }
}

String WiFiManager::getIPAddress() {
    if (apMode) {
        return WiFi.softAPIP().toString();
    } else {
        return WiFi.localIP().toString();
    }
}

bool WiFiManager::isConnected() {
    if (apMode) {
        return true; // AP her zaman "bağlı"
    } else {
        return WiFi.status() == WL_CONNECTED;
    }
}

void WiFiManager::setMode(bool accessPointMode) {
    apMode = accessPointMode;
}