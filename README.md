# esp8266-rc-car

ESP8266 tabanlı WiFi kontrollü RC araba projesi.

## Özellikler

- 🎮 **Dual Joystick Kontrol** - İki ayrı joystick ile hassas kontrol (ileri-geri / sağ-sol)
- 📱 **Mobil Uyumlu** - Yatay mod için optimize edilmiş responsive tasarım
- 🔘 **Buton Kontrol** - Alternatif klasik buton kontrol arayüzü
- 🚗 **Yumuşak Hızlanma** - 2 saniyelik hızlanma/yavaşlama sistemi
- 📡 **WebSocket İletişim** - Gerçek zamanlı, düşük gecikmeli kontrol
- 🌐 **Access Point Modu** - İnternet bağlantısı gerektirmez

## Donanım

- **Mikrokontrolcü:** ESP8266 (NodeMCU ESP-12E)
- **Motor Sürücü:** TB6612FNG Dual Motor Driver
- **Dosya Sistemi:** LittleFS
- **İletişim:** WiFi AP (192.168.4.1)

## Kurulum

1. PlatformIO IDE'yi yükleyin
2. Projeyi klonlayın
3. `platformio.ini` dosyasındaki ayarları kontrol edin
4. Web dosyalarını yükleyin: `pio run --target uploadfs`
5. Firmware'i yükleyin: `pio run --target upload`

## Kullanım

1. ESP8266'yı açın
2. WiFi ağlarından **RC_Araba_AP** ağına bağlanın (Şifre: 12345678)
3. Tarayıcıda `http://192.168.4.1` adresine gidin
4. **Buton Kontrol** için `index.html` veya **Joystick Kontrol** için `joystick.html` kullanın

## Kontrol Modları

### Joystick Kontrol (Önerilen - Mobil)
- Telefonu **yatay** tutun
- Sol joystick: İleri/Geri hareket
- Sağ joystick: Sağa/Sola dönüş
- Yumuşak hızlanma sistemi ile araba benzeri kontrol

### Buton Kontrol
- D-Pad tarzı yön butonları
- Hız slider'ı ile PWM kontrolü
- Masaüstü kullanım için ideal

## Teknik Detaylar

- **WebSocket Port:** 81
- **HTTP Port:** 80
- **PWM Aralığı:** 0-1023 (10-bit)
- **Joystick Güncelleme:** 20Hz (50ms)
- **Hızlanma Süresi:** 2 saniye (0→100%)

## Geliştirme

- **Framework:** Arduino
- **Build System:** PlatformIO
- **Web Tech:** NippleJS, WebSocket, JSON

## Lisans

MIT License

## Katkıda Bulunanlar

- [@opensapcommunity](https://github.com/opensapcommunity)
