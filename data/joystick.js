// ============================================================================
// RC Araba Joystick Kontrol - NippleJS Integration
// ============================================================================
// Kullanıcıdan sağlanan en küçük çalışan örneği temel alan, iki joystick implementasyonu
// ============================================================================

// Bağlantı yönetimi
let ws = null;
let wsConnected = false;
let currentSpeed = 150;

// Joystick değerleri (global olarak tutuyoruz)
let joystickValues = {
    vertical: { x: 0, y: 0, distance: 0 },
    horizontal: { x: 0, y: 0, distance: 0 }
};

// Hızlanma sistemi için değerler
let currentMotorSpeeds = {
    left: 0,
    right: 0
};

let targetMotorSpeeds = {
    left: 0,
    right: 0
};

// Last send time (throttle için)
let lastSend = 0;
const SEND_INTERVAL = 50; // 50ms = ~20Hz

// Hızlanma sabitleri
const ACCELERATION_TIME = 2000; // 2 saniye içinde tam hıza ulaş
const ACCELERATION_STEP = SEND_INTERVAL / ACCELERATION_TIME; // Her 50ms'de ne kadar artacak (0.025 = %2.5)

// ============================================================================
// İlk başlangıç
// ============================================================================
function init() {
    console.log('Joystick kontrol sayfası başlatılıyor...');
    
    // WebSocket bağlantısı
    connectWebSocket();
    
    // Joystick'leri oluştur
    initializeJoysticks();
    
    // IP adresi al
    fetchIPAddress();
    
    // Sürekli hızlanma güncellemesi için interval (50ms = 20Hz)
    setInterval(() => {
        sendToESP();
    }, SEND_INTERVAL);
    
    // 100ms sonra motoru durdur (güvenlik)
    setTimeout(() => {
        sendCommand('stop');
    }, 100);
}

// ============================================================================
// WebSocket Bağlantısı
// ============================================================================
function connectWebSocket() {
    try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:81`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            wsConnected = true;
            updateConnectionStatus(true);
            showToast('WebSocket bağlantısı kuruldu ✓');
            console.log('WebSocket bağlantısı kuruldu');
        };
        
        ws.onmessage = (event) => {
            console.log('WS mesaj:', event.data);
        };
        
        ws.onerror = (error) => {
            wsConnected = false;
            updateConnectionStatus(false);
            showToast('WebSocket hatası ✗');
            console.error('WebSocket hatası:', error);
        };
        
        ws.onclose = () => {
            wsConnected = false;
            updateConnectionStatus(false);
            showToast('Bağlantı koptu');
            // 3 saniye sonra yeniden bağlanmayı dene
            setTimeout(connectWebSocket, 3000);
        };
        
    } catch (error) {
        console.error('WebSocket başlangıç hatası:', error);
        showToast('Bağlantı kurulamadı');
    }
}

// ============================================================================
// Joystick İlkleştirme
// ============================================================================
function initializeJoysticks() {
    console.log('Joystick\'ler ilkleştiriliyor...');
    
    // VERTICAL JOYSTICK (İleri/Geri)
    initVerticalJoystick();
    
    // HORIZONTAL JOYSTICK (Sağa/Sola)
    initHorizontalJoystick();
}

// Dikey joystick - Y ekseni (ileri/geri)
function initVerticalJoystick() {
    const zoneElement = document.getElementById('zone-vertical');
    const outputElement = document.getElementById('output-vertical');
    
    const manager = nipplejs.create({
        zone: zoneElement,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'rgba(46, 204, 113, 0.8)',
        size: 180,
        threshold: 0.2,
        restOpacity: 0.5,
        lockX: true  // X eksenini kilitle - sadece Y ekseni hareket eder
    });
    
    // Move event - değerleri OLAYIDARDAÇAĞABILENİN içinde oku
    manager.on('move', (evt, data) => {
        if (!data) return;
        
        // data.vector: -1 to 1 aralığında normalize edilmiş x,y
        const y = clamp(data.vector.y, -1, 1); // Y ekseni: ileri(-)/geri(+)
        
        // -100 to 100 aralığına çevir
        const forward = -Math.round(y * 100); // Ters çevir: up = positive
        
        // Değerleri global tuttur
        joystickValues.vertical = {
            y: y.toFixed(2),
            forward: forward,
            distance: Math.round(data.distance),
            angle: Math.round(data.angle.degree)
        };
        
        // Ekrana yazdır (debug)
        outputElement.textContent = 
            `Y (İleri/Geri): ${y.toFixed(2)}\n` +
            `Kontrol Değeri: ${forward}\n` +
            `Mesafe: ${Math.round(data.distance)}px\n` +
            `Açı: ${Math.round(data.angle.degree)}°`;
        
        // sendToESP otomatik olarak interval ile çağrılıyor, buradan çağırmaya gerek yok
    });
    
    manager.on('end', () => {
        joystickValues.vertical = { y: 0, forward: 0, distance: 0 };
        outputElement.textContent = 'Hareketi bekliyorum...';
        // Hedef hızı sıfırla (yumuşak duruş için)
        targetMotorSpeeds.left = 0;
        targetMotorSpeeds.right = 0;
    });
    
    console.log('Dikey joystick (İleri/Geri) oluşturuldu');
}

// Yatay joystick - X ekseni (sağa/sola)
function initHorizontalJoystick() {
    const zoneElement = document.getElementById('zone-horizontal');
    const outputElement = document.getElementById('output-horizontal');
    
    const manager = nipplejs.create({
        zone: zoneElement,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'rgba(231, 76, 60, 0.8)',
        size: 180,
        threshold: 0.2,
        restOpacity: 0.5,
        lockY: true  // Y eksenini kilitle - sadece X ekseni hareket eder
    });
    
    // Move event
    manager.on('move', (evt, data) => {
        if (!data) return;
        
        // data.vector: -1 to 1 aralığında normalize edilmiş x,y
        const x = clamp(data.vector.x, -1, 1); // X ekseni: sol(-)/sağ(+)
        
        // -100 to 100 aralığına çevir
        const turn = Math.round(x * 100);
        
        // Değerleri global tuttur
        joystickValues.horizontal = {
            x: x.toFixed(2),
            turn: turn,
            distance: Math.round(data.distance),
            angle: Math.round(data.angle.degree)
        };
        
        // Ekrana yazdır (debug)
        outputElement.textContent = 
            `X (Sağ/Sol): ${x.toFixed(2)}\n` +
            `Kontrol Değeri: ${turn}\n` +
            `Mesafe: ${Math.round(data.distance)}px\n` +
            `Açı: ${Math.round(data.angle.degree)}°`;
        
        // sendToESP otomatik olarak interval ile çağrılıyor, buradan çağırmaya gerek yok
    });
    
    manager.on('end', () => {
        joystickValues.horizontal = { x: 0, turn: 0, distance: 0 };
        outputElement.textContent = 'Hareketi bekliyorum...';
        // Hedef hızı sıfırla (yumuşak duruş için)
        targetMotorSpeeds.left = 0;
        targetMotorSpeeds.right = 0;
    });
    
    console.log('Yatay joystick (Sağ/Sol) oluşturuldu');
}

// ============================================================================
// ESP8266'ya Veri Gönderme (Hızlanma ile)
// ============================================================================
function sendToESP() {
    const now = Date.now();
    
    // Throttle: 50ms'de bir gönder (~20Hz)
    if (now - lastSend < SEND_INTERVAL) {
        return;
    }
    
    lastSend = now;
    
    // Joystick değerlerini kombinle
    const vertical = joystickValues.vertical.forward || 0;
    const horizontal = joystickValues.horizontal.turn || 0;
    
    // Hedef hızları hesapla (-100..100 arası)
    const targetLeft = Math.round(Math.max(-100, Math.min(100, vertical + horizontal)));
    const targetRight = Math.round(Math.max(-100, Math.min(100, vertical - horizontal)));
    
    // Hedef hızları güncelle
    targetMotorSpeeds.left = targetLeft;
    targetMotorSpeeds.right = targetRight;
    
    // Mevcut hızı hedef hıza doğru yavaşça artır/azalt (hızlanma efekti)
    currentMotorSpeeds.left = smoothApproach(currentMotorSpeeds.left, targetMotorSpeeds.left);
    currentMotorSpeeds.right = smoothApproach(currentMotorSpeeds.right, targetMotorSpeeds.right);
    
    // PWM değerlerine çevir (-100..100 -> -1000..1000)
    let leftSpeed = Math.round(currentMotorSpeeds.left * 10);
    let rightSpeed = Math.round(currentMotorSpeeds.right * 10);
    
    console.log(`Gönderiliyor: left=${leftSpeed}, right=${rightSpeed} | Hedef: ${targetLeft*10}, ${targetRight*10}`);
    
    if (wsConnected && ws && ws.readyState === WebSocket.OPEN) {
        // ESP'nin beklediği JSON formatı
        const payload = {
            cmd: "custom",
            left: leftSpeed,
            right: rightSpeed
        };
        
        ws.send(JSON.stringify(payload));
    }
}

// Yavaşça hedefe yaklaşma fonksiyonu (smooth ramping)
function smoothApproach(current, target) {
    const maxChange = 100 * ACCELERATION_STEP; // 2 saniyede 100'e ulaşmak için her adımda ne kadar değişecek
    
    const diff = target - current;
    
    if (Math.abs(diff) < maxChange) {
        // Hedefe yeterince yakınız, direkt hedefe git
        return target;
    } else if (diff > 0) {
        // Artır
        return current + maxChange;
    } else {
        // Azalt
        return current - maxChange;
    }
}

// ============================================================================
// Komut Gönderme Yardımcısı
// ============================================================================
function sendCommand(cmdStr) {
    if (wsConnected && ws && ws.readyState === WebSocket.OPEN) {
        // JSON formatında gönder
        const payload = {
            cmd: "move",
            direction: cmdStr // "stop", "forward" vb.
        };
        ws.send(JSON.stringify(payload));
        console.log('Komut gönderildi:', payload);
    }
}

// ============================================================================
// Yardımcı Fonksiyonlar
// ============================================================================
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (connected) {
        statusEl.innerHTML = '<i class="fas fa-wifi"></i> Bağlı';
        statusEl.classList.add('connected');
    } else {
        statusEl.innerHTML = '<i class="fas fa-wifi-slash"></i> Bağlı Değil';
        statusEl.classList.remove('connected');
    }
}

function fetchIPAddress() {
    fetch('/api/ip')
        .then(response => response.json())
        .then(data => {
            document.getElementById('ipAddress').textContent = data.ip || 'Bilinmiyor';
        })
        .catch(error => {
            console.error('IP hatası:', error);
            document.getElementById('ipAddress').textContent = '192.168.4.1';
        });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================================================
// Sayfa Başlangıcı
// ============================================================================
document.addEventListener('DOMContentLoaded', init);

// Sayfa kapatılırken motoru durdur
window.addEventListener('beforeunload', () => {
    if (wsConnected && ws) {
        sendCommand('stop');
        ws.close();
    }
});
