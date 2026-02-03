#include "MotorController.h"

MotorController::MotorController(uint8_t pwma, uint8_t ain1, uint8_t ain2,
                               uint8_t pwmb, uint8_t bin1, uint8_t bin2,
                               uint8_t stby) {
    PWMA = pwma;
    AIN1 = ain1;
    AIN2 = ain2;
    PWMB = pwmb;
    BIN1 = bin1;
    BIN2 = bin2;
    STBY = stby;
    currentSpeed = 150; // Varsayılan hız
}

void MotorController::begin() {
    pinMode(PWMA, OUTPUT);
    pinMode(AIN1, OUTPUT);
    pinMode(AIN2, OUTPUT);
    pinMode(PWMB, OUTPUT);
    pinMode(BIN1, OUTPUT);
    pinMode(BIN2, OUTPUT);
    pinMode(STBY, OUTPUT);
    
    digitalWrite(STBY, HIGH); // STBY'yi HIGH yap (aktif)
    stop(); // Başlangıçta motorlar durdurulur
}

void MotorController::setSpeed(int speed) {
    if (speed < 0) speed = 0;
    if (speed > 255) speed = 255;
    currentSpeed = speed;
}

void MotorController::forward() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor ileri
    digitalWrite(AIN1, HIGH);
    digitalWrite(AIN2, LOW);
    analogWrite(PWMA, currentSpeed);
    
    // Sağ motor ileri
    digitalWrite(BIN1, HIGH);
    digitalWrite(BIN2, LOW);
    analogWrite(PWMB, currentSpeed);
}

void MotorController::backward() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor geri
    digitalWrite(AIN1, LOW);
    digitalWrite(AIN2, HIGH);
    analogWrite(PWMA, currentSpeed);
    
    // Sağ motor geri
    digitalWrite(BIN1, LOW);
    digitalWrite(BIN2, HIGH);
    analogWrite(PWMB, currentSpeed);
}

void MotorController::turnLeft() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor geri
    digitalWrite(AIN1, LOW);
    digitalWrite(AIN2, HIGH);
    analogWrite(PWMA, currentSpeed * 0.7);
    
    // Sağ motor ileri
    digitalWrite(BIN1, HIGH);
    digitalWrite(BIN2, LOW);
    analogWrite(PWMB, currentSpeed);
}

void MotorController::turnRight() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor ileri
    digitalWrite(AIN1, HIGH);
    digitalWrite(AIN2, LOW);
    analogWrite(PWMA, currentSpeed);
    
    // Sağ motor geri
    digitalWrite(BIN1, LOW);
    digitalWrite(BIN2, HIGH);
    analogWrite(PWMB, currentSpeed * 0.7);
}

void MotorController::forwardLeft() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor yavaş ileri
    digitalWrite(AIN1, HIGH);
    digitalWrite(AIN2, LOW);
    analogWrite(PWMA, currentSpeed * 0.5);
    
    // Sağ motor tam hız ileri
    digitalWrite(BIN1, HIGH);
    digitalWrite(BIN2, LOW);
    analogWrite(PWMB, currentSpeed);
}

void MotorController::forwardRight() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor tam hız ileri
    digitalWrite(AIN1, HIGH);
    digitalWrite(AIN2, LOW);
    analogWrite(PWMA, currentSpeed);
    
    // Sağ motor yavaş ileri
    digitalWrite(BIN1, HIGH);
    digitalWrite(BIN2, LOW);
    analogWrite(PWMB, currentSpeed * 0.5);
}

void MotorController::backwardLeft() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor yavaş geri
    digitalWrite(AIN1, LOW);
    digitalWrite(AIN2, HIGH);
    analogWrite(PWMA, currentSpeed * 0.5);
    
    // Sağ motor tam hız geri
    digitalWrite(BIN1, LOW);
    digitalWrite(BIN2, HIGH);
    analogWrite(PWMB, currentSpeed);
}

void MotorController::backwardRight() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor tam hız geri
    digitalWrite(AIN1, LOW);
    digitalWrite(AIN2, HIGH);
    analogWrite(PWMA, currentSpeed);
    
    // Sağ motor yavaş geri
    digitalWrite(BIN1, LOW);
    digitalWrite(BIN2, HIGH);
    analogWrite(PWMB, currentSpeed * 0.5);
}

void MotorController::stop() {
    digitalWrite(AIN1, LOW);
    digitalWrite(AIN2, LOW);
    digitalWrite(BIN1, LOW);
    digitalWrite(BIN2, LOW);
    analogWrite(PWMA, 0);
    analogWrite(PWMB, 0);
}

void MotorController::pivotLeft() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor geri
    digitalWrite(AIN1, LOW);
    digitalWrite(AIN2, HIGH);
    analogWrite(PWMA, currentSpeed);
    
    // Sağ motor ileri
    digitalWrite(BIN1, HIGH);
    digitalWrite(BIN2, LOW);
    analogWrite(PWMB, currentSpeed);
}

void MotorController::pivotRight() {
    digitalWrite(STBY, HIGH);
    
    // Sol motor ileri
    digitalWrite(AIN1, HIGH);
    digitalWrite(AIN2, LOW);
    analogWrite(PWMA, currentSpeed);
    
    // Sağ motor geri
    digitalWrite(BIN1, LOW);
    digitalWrite(BIN2, HIGH);
    analogWrite(PWMB, currentSpeed);
}

void MotorController::smoothTurn(int leftSpeed, int rightSpeed) {
    Serial.printf("smoothTurn çalıştırılıyor: leftSpeed=%d, rightSpeed=%d\n", leftSpeed, rightSpeed);
    digitalWrite(STBY, HIGH);
    
    // Sol motor
    if (leftSpeed >= 0) {
        Serial.println("Sol motor ileri");
        digitalWrite(AIN1, HIGH);
        digitalWrite(AIN2, LOW);
        analogWrite(PWMA, abs(leftSpeed));
    } else {
        Serial.println("Sol motor geri");
        digitalWrite(AIN1, LOW);
        digitalWrite(AIN2, HIGH);
        analogWrite(PWMA, abs(leftSpeed));
    }
    
    // Sağ motor
    if (rightSpeed >= 0) {
        Serial.println("Sağ motor ileri");
        digitalWrite(BIN1, HIGH);
        digitalWrite(BIN2, LOW);
        analogWrite(PWMB, abs(rightSpeed));
    } else {
        Serial.println("Sağ motor geri");
        digitalWrite(BIN1, LOW);
        digitalWrite(BIN2, HIGH);
        analogWrite(PWMB, abs(rightSpeed));
    }
    
    Serial.println("smoothTurn tamamlandı");
}

int MotorController::getCurrentSpeed() {
    return currentSpeed;
}