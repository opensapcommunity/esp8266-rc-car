#ifndef WEB_SERVER_MANAGER_H
#define WEB_SERVER_MANAGER_H

#include <ESPAsyncWebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include "MotorController.h"

class WebServerManager {
private:
    AsyncWebServer* server;
    WebSocketsServer* webSocket;
    MotorController* motor;
    
    const int webSocketPort = 81;
    
    void handleWebSocketMessage(uint8_t num, uint8_t* payload, size_t length);
    void handleRoot(AsyncWebServerRequest* request);
    void handleCommand(AsyncWebServerRequest* request);
    void handleNotFound(AsyncWebServerRequest* request);
    
public:
    WebServerManager(MotorController* motorController);
    void begin();
    void loop();
    
    // WebSocket event handler
    static void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length);
};

#endif