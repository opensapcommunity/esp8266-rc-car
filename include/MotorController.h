#ifndef MOTOR_CONTROLLER_H
#define MOTOR_CONTROLLER_H

#include <Arduino.h>

class MotorController {
private:
    // TB6612FNG Pin Tanımlamaları
    uint8_t PWMA;      // Sol motor PWM
    uint8_t AIN1;      // Sol motor IN1
    uint8_t AIN2;      // Sol motor IN2
    
    uint8_t PWMB;      // Sağ motor PWM
    uint8_t BIN1;      // Sağ motor IN1
    uint8_t BIN2;      // Sağ motor IN2
    
    uint8_t STBY;      // Standby pin
    
    int currentSpeed;
    
public:
    MotorController(uint8_t pwma, uint8_t ain1, uint8_t ain2, 
                   uint8_t pwmb, uint8_t bin1, uint8_t bin2, 
                   uint8_t stby);
    
    void begin();
    void setSpeed(int speed);
    
    // Temel Hareket Fonksiyonları
    void forward();
    void backward();
    void turnLeft();
    void turnRight();
    void forwardLeft();
    void forwardRight();
    void backwardLeft();
    void backwardRight();
    void stop();
    
    // Özel Hareketler
    void pivotLeft();
    void pivotRight();
    void smoothTurn(int leftSpeed, int rightSpeed);
    
    // Getter
    int getCurrentSpeed();
};

#endif