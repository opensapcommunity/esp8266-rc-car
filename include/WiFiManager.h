#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <ESP8266WiFi.h>
#include <ESPAsyncWebServer.h>
#include <WebSocketsServer.h>

class WiFiManager {
private:
    const char* ssid = "RC_Araba_AP";
    const char* password = "12345678";
    
    // Veya istasyon modu için:
    // const char* ssid = "Ev_WIFI_Adi";
    // const char* password = "Ev_WIFI_Sifresi";
    
    bool apMode = true; // true: Access Point, false: Station
    
public:
    void begin();
    String getIPAddress();
    bool isConnected();
    void setMode(bool accessPointMode);
};

#endif