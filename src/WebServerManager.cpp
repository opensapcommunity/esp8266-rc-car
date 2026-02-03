#include "WebServerManager.h"
#include <LittleFS.h>

// Static pointer for WebSocket callback
static WebServerManager* instance = nullptr;

WebServerManager::WebServerManager(MotorController* motorController) {
    motor = motorController;
    server = new AsyncWebServer(80);
    webSocket = new WebSocketsServer(webSocketPort);
    
    instance = this; // Set static instance
}

void WebServerManager::begin() {
    // WebSocket başlat
    webSocket->begin();
    webSocket->onEvent(onWebSocketEvent);
    
    // Root sayfası
    server->on("/", HTTP_GET, [this](AsyncWebServerRequest* request) {
        handleRoot(request);
    });
    
    // Komut endpoint'i
    server->on("/control", HTTP_GET, [this](AsyncWebServerRequest* request) {
        handleCommand(request);
    });
    
    // Statik dosyalar (SPIFFS'den)
    server->serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
    
    // 404 handler
    server->onNotFound([this](AsyncWebServerRequest* request) {
        handleNotFound(request);
    });
    
    // Server'ı başlat
    server->begin();
    
    Serial.println("HTTP server başlatıldı");
    Serial.println("WebSocket server başlatıldı (port: " + String(webSocketPort) + ")");
}

void WebServerManager::loop() {
    webSocket->loop();
}

void WebServerManager::handleRoot(AsyncWebServerRequest* request) {
    request->redirect("/index.html");
}

void WebServerManager::handleCommand(AsyncWebServerRequest* request) {
    if (request->hasParam("cmd")) {
        String command = request->getParam("cmd")->value();
        
        if (command == "F") motor->forward();
        else if (command == "B") motor->backward();
        else if (command == "L") motor->turnLeft();
        else if (command == "R") motor->turnRight();
        else if (command == "FL") motor->forwardLeft();
        else if (command == "FR") motor->forwardRight();
        else if (command == "BL") motor->backwardLeft();
        else if (command == "BR") motor->backwardRight();
        else if (command == "S") motor->stop();
        else if (command == "PL") motor->pivotLeft();
        else if (command == "PR") motor->pivotRight();
        else if (command.startsWith("SPD:")) {
            int speed = command.substring(4).toInt();
            motor->setSpeed(speed);
        }
        
        request->send(200, "text/plain", "OK");
    } else {
        request->send(400, "text/plain", "Bad Request");
    }
}

void WebServerManager::handleNotFound(AsyncWebServerRequest* request) {
    String message = "File Not Found\n\n";
    message += "URI: ";
    message += request->url();
    message += "\nMethod: ";
    message += (request->method() == HTTP_GET) ? "GET" : "POST";
    message += "\nArguments: ";
    message += request->args();
    message += "\n";
    
    for (size_t i = 0; i < request->args(); i++) {
        message += " " + request->argName(i) + ": " + request->arg(i) + "\n";
    }
    
    request->send(404, "text/plain", message);
}

void WebServerManager::handleWebSocketMessage(uint8_t num, uint8_t* payload, size_t length) {
    String message = String((char*)payload).substring(0, length);
    
    StaticJsonDocument<200> doc;
    deserializeJson(doc, message);
    
    String cmd = doc["cmd"];
    int value = doc["value"] | 0;
    
    if (cmd == "move") {
        String direction = doc["direction"];
        
        if (direction == "forward") motor->forward();
        else if (direction == "backward") motor->backward();
        else if (direction == "left") motor->turnLeft();
        else if (direction == "right") motor->turnRight();
        else if (direction == "stop") {
            // Güvenlik için birkaç kez stop çağrısı yap
            motor->stop();
            delay(10);
            motor->stop();
        }
        else if (direction == "forward_left") motor->forwardLeft();
        else if (direction == "forward_right") motor->forwardRight();
        else if (direction == "backward_left") motor->backwardLeft();
        else if (direction == "backward_right") motor->backwardRight();
        
    } else if (cmd == "speed") {
        motor->setSpeed(value);
        
    } else if (cmd == "custom") {
        int leftSpeed = doc["left"] | 0;
        int rightSpeed = doc["right"] | 0;
        Serial.printf("Custom komut ALINDI: left=%d, right=%d\n", leftSpeed, rightSpeed);
        Serial.println("smoothTurn çağrılıyor...");
        motor->smoothTurn(leftSpeed, rightSpeed);
        Serial.println("smoothTurn tamamlandı");
    }
    
    // Geri bildirim gönder
    StaticJsonDocument<100> response;
    response["status"] = "ok";
    response["speed"] = motor->getCurrentSpeed();
    
    String responseStr;
    serializeJson(response, responseStr);
    webSocket->sendTXT(num, responseStr);
}

void WebServerManager::onWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
    if (!instance) return;
    
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("[%u] Bağlantı kesildi\n", num);
            instance->motor->stop(); // Güvenlik için motorları durdur
            break;
            
        case WStype_CONNECTED:
            {
                Serial.printf("[%u] Bağlantı kuruldu\n", num);
                // Güvenlik için motoru durdur
                instance->motor->stop();
                
                // İstemciye hoşgeldin mesajı gönder
                String welcome = "{\"type\":\"welcome\",\"message\":\"RC Araba'ya hoş geldiniz!\"}";
                instance->webSocket->sendTXT(num, welcome);
            }
            break;
            
        case WStype_TEXT:
            instance->handleWebSocketMessage(num, payload, length);
            break;
            
        case WStype_ERROR:
            Serial.printf("[%u] WebSocket hatası\n", num);
            break;
            
        case WStype_FRAGMENT_TEXT_START:
        case WStype_FRAGMENT_BIN_START:
        case WStype_FRAGMENT_FIN:
        case WStype_BIN:
        case WStype_FRAGMENT:
        case WStype_PING:
        case WStype_PONG:
            // Diğer mesaj türleri - şimdilik ignore et
            break;
    }
}