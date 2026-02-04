#ifndef AUDIO_MANAGER_H
#define AUDIO_MANAGER_H

#include <Arduino.h>

class AudioManager {
public:
    AudioManager(uint8_t rxPin, uint8_t txPin);
    void begin();

    void playHorn();
    void playSiren();
    void playNextSong();
    void stop();

    bool isReady() const { return ready; }

private:
    uint8_t rxPin;
    uint8_t txPin;
    bool ready = false;

    uint8_t songMin = 1;
    uint8_t songMax = 10;
    uint8_t currentSong = 0;

    uint8_t hornTrack = 11;
    uint8_t sirenTrack = 12;

    void playTrack(uint16_t track);
};

#endif
