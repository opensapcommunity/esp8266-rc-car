#include "AudioManager.h"
#include <SoftwareSerial.h>
#include <DFRobotDFPlayerMini.h>

static SoftwareSerial* dfSerial = nullptr;
static DFRobotDFPlayerMini dfPlayer;

AudioManager::AudioManager(uint8_t rxPin, uint8_t txPin)
    : rxPin(rxPin), txPin(txPin) {}

void AudioManager::begin() {
    dfSerial = new SoftwareSerial(rxPin, txPin);
    dfSerial->begin(9600);

    if (!dfPlayer.begin(*dfSerial)) {
        Serial.println("DFPlayer başlatılamadı!");
        ready = false;
        return;
    }

    dfPlayer.volume(20); // 0-30
    dfPlayer.EQ(DFPLAYER_EQ_NORMAL);
    ready = true;
    Serial.println("DFPlayer hazır");
}

void AudioManager::playTrack(uint16_t track) {
    if (!ready) return;
    dfPlayer.play(track);
}

void AudioManager::playHorn() {
    playTrack(hornTrack);
}

void AudioManager::playSiren() {
    playTrack(sirenTrack);
}

void AudioManager::playNextSong() {
    if (!ready) return;

    if (currentSong < songMin || currentSong >= songMax) {
        currentSong = songMin;
    } else {
        currentSong++;
    }

    dfPlayer.play(currentSong);
}

void AudioManager::stop() {
    if (!ready) return;
    dfPlayer.stop();
}
