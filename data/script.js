class RCCarController {
    constructor() {
        this.ws = null;
        this.currentSpeed = 150;
        this.autoReconnect = true;
        this.reconnectInterval = 3000;
        this.commandInterval = null;
        this.activeCommand = null;
        this.lastJoystickCommand = 0; // Throttle için
        this.joystickThrottleDelay = 100; // 100ms'de bir komut
        
        this.init();
    }
    
    init() {
        // Sayfa yüklendiğinde tüm aktif komutları temizle
        this.activeCommand = null;
        if (this.commandInterval) {
            clearInterval(this.commandInterval);
            this.commandInterval = null;
        }
        
        this.bindEvents();
        this.connectWebSocket();
        this.updateIP();
        this.setupKeyboardControls();
        this.setupJoystick(); // Joystick'i başlat
        this.showToast('Sistem başlatıldı', 'info');
        
        // Sayfa yüklendiğinde motoru durdur (güvenlik için)
        setTimeout(() => {
            this.emergencyStop();
        }, 100);
    }
    
    bindEvents() {
        // Hız slider'ı
        document.getElementById('speedSlider').addEventListener('input', (e) => {
            this.updateSpeed(e.target.value);
        });
        
        // Bağlantı durumu kontrolü
        setInterval(() => {
            this.updateConnectionStatus();
        }, 5000);
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:81`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket bağlantısı açıldı');
            this.showToast('WebSocket bağlantısı kuruldu', 'success');
            this.updateConnectionStatus(true);
            
            // Bağlantı kurulduğunda motoru durdur (güvenlik için)
            setTimeout(() => {
                console.log('Bağlantı sonrası motor durdurma komutu gönderiliyor');
                this.emergencyStop();
            }, 200);
        };
        
        this.ws.onclose = () => {
            this.showToast('WebSocket bağlantısı kesildi', 'error');
            this.updateConnectionStatus(false);
            
            if (this.autoReconnect) {
                setTimeout(() => {
                    this.showToast('Yeniden bağlanılıyor...', 'warning');
                    this.connectWebSocket();
                }, this.reconnectInterval);
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket hatası:', error);
            this.showToast('Bağlantı hatası oluştu', 'error');
        };
        
        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (e) {
                console.log('Mesaj:', event.data);
            }
        };
    }
    
    handleWebSocketMessage(data) {
        if (data.type === 'welcome') {
            console.log('Sunucu mesajı:', data.message);
        } else if (data.status === 'ok') {
            if (data.speed !== undefined) {
                this.currentSpeed = data.speed;
                this.updateSpeedDisplay();
            }
        }
    }
    
    sendCommand(command, value = null) {
        console.log(`sendCommand çağrıldı: ${command}`, value);
        
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket bağlantısı yok!');
            this.showToast('Bağlantı yok!', 'error');
            return;
        }
        
        const message = value !== null 
            ? JSON.stringify({ cmd: command, value: value })
            : JSON.stringify({ cmd: 'move', direction: command });
        
        console.log(`WebSocket mesajı gönderiliyor: ${message}`);
        this.ws.send(message);
        
        // Komut geçmişi (opsiyonel)
        console.log(`Komut gönderildi: ${command}`, value ? `Değer: ${value}` : '');
    }
    
    // Dur butonu için özel fonksiyon - tüm aktif komutları durdur
    emergencyStop() {
        console.log('emergencyStop çağrıldı');
        
        // Tüm aktif interval'ları temizle
        if (this.commandInterval) {
            clearInterval(this.commandInterval);
            this.commandInterval = null;
            console.log('Interval temizlendi');
        }
        
        // Aktif komutu sıfırla
        this.activeCommand = null;
        console.log('Aktif komut sıfırlandı');
        
        // Birkaç kez stop komutu gönder (güvenlik için)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                console.log(`Stop komutu ${i + 1}/3 gönderiliyor`);
                this.sendCommand('stop');
            }, i * 50); // 0ms, 50ms, 100ms'de gönder
        }
    }
    
    startCommand(command) {
        console.log(`startCommand çağrıldı: ${command}, aktif komut: ${this.activeCommand}`);
        
        if (this.activeCommand === command) {
            console.log('Aynı komut zaten aktif, işlem yapılmadı');
            return;
        }
        
        // Önceki komutu durdur
        this.stopCommand();
        
        this.activeCommand = command;
        console.log(`Yeni aktif komut: ${this.activeCommand}`);
        this.sendCommand(command);
        
        // Sürekli komut gönderme - interval'i artır (daha stabil)
        this.commandInterval = setInterval(() => {
            if (this.activeCommand === command) {
                this.sendCommand(command);
            }
        }, 200); // 200ms'ye çıkar (daha az sıklık)
    }
    
    stopCommand() {
        if (this.commandInterval) {
            clearInterval(this.commandInterval);
            this.commandInterval = null;
        }
        
        if (this.activeCommand && this.activeCommand !== 'stop') {
            this.sendCommand('stop');
        }
        
        this.activeCommand = null;
    }
    
    updateSpeed(speed) {
        this.currentSpeed = parseInt(speed);
        document.getElementById('currentSpeedDisplay').textContent = speed;
        document.getElementById('speedValue').textContent = speed;
        
        this.sendCommand('speed', this.currentSpeed);
        this.showToast(`Hız ${speed} olarak ayarlandı`, 'info');
    }
    
    setSpeed(speed) {
        document.getElementById('speedSlider').value = speed;
        this.updateSpeed(speed);
    }
    
    updateSpeedDisplay() {
        document.getElementById('currentSpeedDisplay').textContent = this.currentSpeed;
        document.getElementById('speedValue').textContent = this.currentSpeed;
        document.getElementById('speedSlider').value = this.currentSpeed;
    }
    
    updateIP() {
        // IP adresini al (localStorage'den veya sunucudan)
        const ip = window.location.hostname || '192.168.4.1';
        document.getElementById('ipAddress').textContent = ip;
    }
    
    updateConnectionStatus(connected = null) {
        const statusEl = document.getElementById('connectionStatus');
        const wsStatusEl = document.getElementById('wsStatus');
        
        if (connected === null) {
            connected = this.ws && this.ws.readyState === WebSocket.OPEN;
        }
        
        if (connected) {
            statusEl.innerHTML = '<i class="fas fa-wifi"></i> Bağlı';
            statusEl.className = 'status-value connected';
            wsStatusEl.textContent = 'Bağlı';
            wsStatusEl.style.color = '#27ae60';
        } else {
            statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Bağlantı Yok';
            statusEl.className = 'status-value';
            statusEl.style.background = 'rgba(231, 76, 60, 0.3)';
            statusEl.style.color = '#c0392b';
            wsStatusEl.textContent = 'Bağlantı Yok';
            wsStatusEl.style.color = '#e74c3c';
        }
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            // Space tuşunu engelle (sayfa kaymasın)
            if (e.code === 'Space') {
                e.preventDefault();
            }
            
            // Sadece belirli tuşlara tepki ver
            const keyMap = {
                'KeyW': 'forward',
                'ArrowUp': 'forward',
                'KeyS': 'backward',
                'ArrowDown': 'backward',
                'KeyA': 'left',
                'ArrowLeft': 'left',
                'KeyD': 'right',
                'ArrowRight': 'right',
                'Space': 'stop',
                'KeyQ': 'pivot_left',
                'KeyE': 'pivot_right',
                'KeyZ': 'forward_left',
                'KeyC': 'forward_right',
                'KeyX': 'backward_left',
                'KeyV': 'backward_right'
            };
            
            const command = keyMap[e.code];
            if (command && !this.activeCommand) {
                this.startCommand(command);
                
                // Butonları vurgula
                this.highlightButton(command);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
            }
            
            const keyMap = {
                'KeyW': 'forward',
                'ArrowUp': 'forward',
                'KeyS': 'backward',
                'ArrowDown': 'backward',
                'KeyA': 'left',
                'ArrowLeft': 'left',
                'KeyD': 'right',
                'ArrowRight': 'right',
                'Space': 'stop',
                'KeyQ': 'pivot_left',
                'KeyE': 'pivot_right',
                'KeyZ': 'forward_left',
                'KeyC': 'forward_right',
                'KeyX': 'backward_left',
                'KeyV': 'backward_right'
            };
            
            if (keyMap[e.code]) {
                this.stopCommand();
                this.removeHighlight();
            }
        });
    }
    
    highlightButton(command) {
        const buttonMap = {
            'forward': 'btnForward',
            'backward': 'btnBackward',
            'left': 'btnLeft',
            'right': 'btnRight',
            'stop': 'btnStop'
        };
        
        const buttonId = buttonMap[command];
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.style.transform = 'scale(0.95)';
                button.style.boxShadow = 'inset 0 3px 5px rgba(0,0,0,0.2)';
            }
        }
    }
    
    removeHighlight() {
        const buttons = ['btnForward', 'btnBackward', 'btnLeft', 'btnRight', 'btnStop'];
        buttons.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.style.transform = '';
                button.style.boxShadow = '';
            }
        });
    }
    
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        
        // Renkleri ayarla
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c',
            'warning': '#f39c12',
            'info': '#3498db'
        };
        
        toast.textContent = message;
        toast.style.background = colors[type] || colors.info;
        
        // Göster
        toast.classList.add('show');
        
        // 3 saniye sonra gizle
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Yardımcı fonksiyonlar
    testMotors() {
        this.showToast('Motor testi başlatılıyor...', 'warning');
        
        const testSequence = [
            { cmd: 'forward', delay: 1000 },
            { cmd: 'stop', delay: 500 },
            { cmd: 'backward', delay: 1000 },
            { cmd: 'stop', delay: 500 },
            { cmd: 'left', delay: 1000 },
            { cmd: 'stop', delay: 500 },
            { cmd: 'right', delay: 1000 },
            { cmd: 'stop', delay: 500 }
        ];
        
        let index = 0;
        const runTest = () => {
            if (index < testSequence.length) {
                const step = testSequence[index];
                this.sendCommand(step.cmd);
                this.showToast(`Test: ${step.cmd}`, 'info');
                index++;
                setTimeout(runTest, step.delay);
            } else {
                this.showToast('Motor testi tamamlandı', 'success');
            }
        };
        
        runTest();
    }
    
    calibrate() {
        this.showToast('Kalibrasyon başlatıldı', 'warning');
        // Kalibrasyon komutlarını gönder
        this.sendCommand('calibrate');
    }
    
    setupJoystick() {
        console.log('Joystick kurulumu başlatılıyor...');
        
        // Joystick zone elementini kontrol et
        const zoneElement = document.getElementById('joystick-zone');
        console.log('Joystick zone elementi:', zoneElement);
        
        if (!zoneElement) {
            console.error('Joystick zone elementi bulunamadı!');
            this.showToast('Joystick elementi bulunamadı!', 'error');
            return;
        }
        
        // Görsel feedback için zone'u yeşil yap
        zoneElement.style.borderColor = '#27ae60';
        zoneElement.style.background = 'radial-gradient(circle, #d5f4e6 0%, #a8e6cf 100%)';
        
        const options = {
            zone: zoneElement,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: '#27ae60', // Yeşil renk
            size: 150,
            threshold: 0.1,
            fadeTime: 200,
            multitouch: false,
            maxNumberOfNipples: 1,
            dataOnly: false,
            restOpacity: 0.8
        };
        
        console.log('Joystick options:', options);
        
        // NippleJS'nin yüklü olup olmadığını kontrol et
        if (typeof nipplejs === 'undefined') {
            console.error('NippleJS kütüphanesi yüklenmemiş!');
            this.showToast('Joystick kütüphanesi yüklenemedi!', 'error');
            return;
        }
        
        try {
            const joystick = nipplejs.create(options);
            console.log('Joystick oluşturuldu:', joystick);
            
            // Başarı mesajı
            this.showToast('Joystick hazır!', 'success');
            
            joystick.on('start', (evt, data) => {
                console.log('Joystick START event');
                this.updateJoystickInfo('Aktif', 0, 0);
                zoneElement.style.borderColor = '#e74c3c'; // Kırmızı - aktif
            });
            
            joystick.on('move', (evt, data) => {
                console.log('=== JOYSTICK MOVE EVENT ===');
                console.log('data.distance:', data.distance);
                console.log('data.force:', data.force);
                console.log('data.angle:', data.angle);
                
                // Force tabanlı distance hesaplama (0-1 arası)
                // NippleJS'de force değeri joystick'in ne kadar hareket ettiğini gösterir
                let distance = 0;
                
                if (data.force !== undefined && data.force > 0) {
                    // Force'u kullan (0-1 arası) - bu NippleJS'de doğru değer
                    distance = Math.min(Math.max(data.force * 100, 0), 100);
                    console.log('Force-based distance:', distance);
                } else if (data.distance !== undefined && data.distance > 0) {
                    // Fallback: distance'ı kullan
                    distance = Math.min(Math.max(data.distance / 75 * 100, 0), 100);
                    console.log('Distance-based distance:', distance);
                }
                
                const angle = data.angle && data.angle.degree ? Math.round(data.angle.degree) : 0;
                
                console.log('Final - distance:', distance, 'angle:', angle);
                
                // Yön belirleme
                let direction = this.getDirectionFromAngle(angle, distance);
                this.updateJoystickInfo(direction, Math.round(distance), angle);
                
                // Motor komutu gönder (throttle ile)
                this.handleJoystickMovement(direction, Math.round(distance));
            });
            
            joystick.on('end', (evt, data) => {
                console.log('Joystick END event');
                this.updateJoystickInfo('Dur', 0, 0);
                zoneElement.style.borderColor = '#27ae60'; // Yeşil - hazır
                this.emergencyStop();
            });
            
            console.log('Joystick başlatıldı ve eventler bağlandı');
            
        } catch (error) {
            console.error('Joystick oluşturma hatası:', error);
            this.showToast('Joystick oluşturulamadı: ' + error.message, 'error');
        }
    }
    
    getDirectionFromAngle(angle, distance) {
        if (distance < 10) return 'Dur';
        
        // 8 yönlü kontrol
        if (angle >= 337.5 || angle < 22.5) return 'İleri';
        if (angle >= 22.5 && angle < 67.5) return 'İleri Sağ';
        if (angle >= 67.5 && angle < 112.5) return 'Sağ';
        if (angle >= 112.5 && angle < 157.5) return 'Geri Sağ';
        if (angle >= 157.5 && angle < 202.5) return 'Geri';
        if (angle >= 202.5 && angle < 247.5) return 'Geri Sol';
        if (angle >= 247.5 && angle < 292.5) return 'Sol';
        if (angle >= 292.5 && angle < 337.5) return 'İleri Sol';
        
        return 'Dur';
    }
    
    handleJoystickMovement(direction, distance) {
        // Throttle kontrolü - çok sık komut gönderme
        const now = Date.now();
        if (now - this.lastJoystickCommand < this.joystickThrottleDelay) {
            return; // Çok sık, atla
        }
        this.lastJoystickCommand = now;
        
        console.log(`Joystick hareket: ${direction}, mesafe: ${distance}`);
        
        // Mesafeye göre hız ayarı (0-100 arası)
        const speed = Math.min(Math.max(distance, 0), 100);
        console.log(`Hesaplanan hız: ${speed}`);
        
        switch(direction) {
            case 'İleri':
                console.log('İleri komutu gönderiliyor');
                this.sendCommand('custom', { left: speed, right: speed });
                break;
            case 'Geri':
                console.log('Geri komutu gönderiliyor');
                this.sendCommand('custom', { left: -speed, right: -speed });
                break;
            case 'Sağ':
                console.log('Sağ komutu gönderiliyor');
                this.sendCommand('custom', { left: speed, right: -speed });
                break;
            case 'Sol':
                console.log('Sol komutu gönderiliyor');
                this.sendCommand('custom', { left: -speed, right: speed });
                break;
            case 'İleri Sağ':
                console.log('İleri Sağ komutu gönderiliyor');
                this.sendCommand('custom', { left: speed, right: speed * 0.3 });
                break;
            case 'İleri Sol':
                console.log('İleri Sol komutu gönderiliyor');
                this.sendCommand('custom', { left: speed * 0.3, right: speed });
                break;
            case 'Geri Sağ':
                console.log('Geri Sağ komutu gönderiliyor');
                this.sendCommand('custom', { left: -speed, right: -speed * 0.3 });
                break;
            case 'Geri Sol':
                console.log('Geri Sol komutu gönderiliyor');
                this.sendCommand('custom', { left: -speed * 0.3, right: -speed });
                break;
            default:
                console.log('Bilinmeyen yön, durdurma komutu gönderiliyor');
                this.emergencyStop();
        }
    }
    
    updateJoystickInfo(direction, distance, angle) {
        document.getElementById('directionDisplay').textContent = direction;
        document.getElementById('distanceDisplay').textContent = distance + '%';
        document.getElementById('angleDisplay').textContent = angle + '°';
    }
    
    showLogs() {
        this.showToast('Log özelliği geliştirme aşamasında', 'info');
    }
}

// Global fonksiyonlar (HTML'den çağrılacak)
let carController;

function sendCommand(cmd, value = null) {
    if (!carController) return;
    carController.sendCommand(cmd, value);
}

function startCommand(cmd) {
    if (!carController) return;
    carController.startCommand(cmd);
}

function stopCommand() {
    if (!carController) return;
    carController.stopCommand();
}

function updateSpeed(value) {
    if (!carController) return;
    carController.updateSpeed(value);
}

function setSpeed(value) {
    if (!carController) return;
    carController.setSpeed(value);
}

function testMotors() {
    if (carController) carController.testMotors();
}

function calibrate() {
    if (carController) carController.calibrate();
}

function showLogs() {
    if (carController) carController.showLogs();
}

// Sayfa yüklendiğinde controller'ı başlat
window.addEventListener('DOMContentLoaded', () => {
    carController = new RCCarController();
});