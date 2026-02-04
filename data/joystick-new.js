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
    
    // VERTICAL JOYSTICK (İleri/Geri) - ZONE-HORIZONTAL kullanacak
    initVerticalJoystick();
    
    // HORIZONTAL JOYSTICK (Sağa/Sola) - ZONE-VERTICAL kullanacak  
    initHorizontalJoystick();
}

// Dikey joystick - Y ekseni (ileri/geri) - DÜZELTME: zone-horizontal kullan
function initVerticalJoystick() {
    const zoneElement = document.getElementById('zone-horizontal'); // DEĞİŞTİRİLDİ
    const outputElement = document.getElementById('output-horizontal'); // DEĞİŞTİRİLDİ
    
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
        
        // Direkt gönder
        sendToESP();
    });
    
    manager.on('end', () => {
        joystickValues.vertical = { y: 0, forward: 0, distance: 0 };
        outputElement.textContent = 'Hareketi bekliyorum...';
        // Motor durdur
        sendToESP();
    });
    
    console.log('Dikey joystick (İleri/Geri) oluşturuldu');
}

// Yatay joystick - X ekseni (sağa/sola) - DÜZELTME: zone-vertical kullan
function initHorizontalJoystick() {
    const zoneElement = document.getElementById('zone-vertical'); // DEĞİŞTİRİLDİ
    const outputElement = document.getElementById('output-vertical'); // DEĞİŞTİRİLDİ
    
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
        
        // Direkt gönder
        sendToESP();
    });
    
    manager.on('end', () => {
        joystickValues.horizontal = { x: 0, turn: 0, distance: 0 };
        outputElement.textContent = 'Hareketi bekliyorum...';
        // Motor durdur
        sendToESP();
    });
    
    console.log('Yatay joystick (Sağ/Sol) oluşturuldu');
}

// ============================================================================
// ESP8266'ya Veri Gönderme (Direkt - hızlanma yok)
// ============================================================================
// Son gönderilen değerleri tut (değer değişmediğinde tekrar gönderme)
let lastSentLeft = 0;
let lastSentRight = 0;

function sendToESP() {
    // Joystick değerlerini kombinle
    const vertical = joystickValues.vertical.forward || 0;
    const horizontal = joystickValues.horizontal.turn || 0;
    
    // Motor hızlarını hesapla (-100..100 arası)
    const leftSpeed = Math.round(Math.max(-100, Math.min(100, vertical + horizontal)));
    const rightSpeed = Math.round(Math.max(-100, Math.min(100, vertical - horizontal)));
    
    // PWM değerlerine çevir (-100..100 -> -1000..1000)
    const leftPWM = leftSpeed * 10;
    const rightPWM = rightSpeed * 10;
    
    // KRİTİK: Değer değişmemişse tekrar gönderme!
    if (leftPWM === lastSentLeft && rightPWM === lastSentRight) {
        return; // Aynı değer, gönderme
    }
    
    lastSentLeft = leftPWM;
    lastSentRight = rightPWM;
    
    console.log(`[DEBUG] V=${vertical}, H=${horizontal} | Motor: L=${leftPWM}, R=${rightPWM}`);
    
    if (!wsConnected) {
        console.error('[HATA] WebSocket bağlı değil!');
        return;
    }
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error('[HATA] WebSocket hazır değil! readyState:', ws ? ws.readyState : 'null');
        return;
    }
    
    // ESP'nin beklediği JSON formatı
    const payload = {
        cmd: "custom",
        left: leftPWM,
        right: rightPWM
    };
    
    console.log('[GÖNDER]', JSON.stringify(payload));
    ws.send(JSON.stringify(payload));
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
