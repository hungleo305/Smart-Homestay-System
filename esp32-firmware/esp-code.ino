#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ArduinoJson.h>
#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include "time.h"
#include <HTTPClient.h>

// ================= CẤU HÌNH WIFI & FIREBASE =================
#define WIFI_SSID "TP-Link_69B0"
#define WIFI_PASSWORD "68252915"

unsigned long previousWiFiMillis = 0;
const long wifiCheckInterval = 10000; // Kiểm tra rớt mạng mỗi 10 giây

#define API_KEY "AIzaSyBAgasxRlpaRYPFK82oqM0vbJAJWo_cHVk" 
#define DATABASE_URL "homestay-online-default-rtdb.asia-southeast1.firebasedatabase.app" 

// Các đường dẫn (Path) lưu dữ liệu trên Firebase Realtime Database
#define ROOM_PATH "/homestay/room_01/bookings" 
#define DOOR_STATUS_PATH "/homestay/room_01/door_status" 
#define REMOTE_CMD_PATH "/homestay/room_01/remote_command"
#define ALERT_PATH "/homestay/room_01/canh_bao"
#define PING_PATH "/homestay/room_01/last_ping"
#define PIN_DISABLED_PATH "/homestay/room_01/pin_disabled"
#define RFID_DISABLED_PATH "/homestay/room_01/rfid_disabled"

// Đối tượng Firebase
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ================= CẤU HÌNH CHÂN PHẦN CỨNG (PINOUT) =================
#define RELAY_PIN 16        // Chân điều khiển Rơ-le mở khóa
#define DOOR_SENSOR_PIN 15  // Chân đọc cảm biến má từ MC-38

// --- Cấu hình Bàn phím ma trận 4x4 ---
const byte ROWS = 4; 
const byte COLS = 4; 
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'} 
};
byte rowPins[ROWS] = {13, 14, 27, 26}; // Nối với các chân Hàng
byte colPins[COLS] = {25, 33, 32, 4};  // Nối với các chân Cột
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// --- Cấu hình Màn hình LCD I2C ---
LiquidCrystal_I2C lcd(0x27, 16, 2); // Địa chỉ I2C thường là 0x27 hoặc 0x3F

// --- Cấu hình Đầu đọc thẻ RFID RC522 ---
#define RST_PIN 17
#define SS_PIN 5
MFRC522 mfrc522(SS_PIN, RST_PIN);

// ================= BIẾN TOÀN CỤC & TRẠNG THÁI =================
String inputPIN = ""; 
int lastDoorState = -1; 
unsigned long lastRemoteCheck = 0; 
unsigned long lastPingTime = 0; 

// Biến quản lý an ninh hệ thống
int wrongAttempts = 0;             // Biến đếm số lần nhập sai
bool isLockedOut = false;          // Cờ báo hiệu hệ thống đang bị khóa cứng (Do dò mã)
bool pinDisabled = false;          // Cờ vô hiệu hóa bàn phím (Nhận từ Web)
bool rfidDisabled = false;         // Cờ vô hiệu hóa thẻ từ (Nhận từ Web)

// ================= HÀM ĐỒNG BỘ THỜI GIAN NTP =================
const long  gmtOffset_sec = 7 * 3600; // Múi giờ Việt Nam (GMT+7)
const int   daylightOffset_sec = 0;   // Không dùng giờ mùa hè

// Hàm lấy thời gian chuẩn quốc tế (Unix Time)
unsigned long getCurrentUnixTime() {
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return 0; // Trả về 0 nếu chưa đồng bộ được mạng
  time(&now);
  return now;
}

// ================= HÀM KHỞI TẠO (SETUP) =================
void setup() {
  Serial.begin(115200); // Khởi tạo cổng Serial để Debug
  
  // 1. Cài đặt chân I/O
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Khóa chốt khi mới cấp điện
  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP); // Dùng điện trở kéo lên nội bộ cho má từ
  
  // 2. Khởi tạo LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("He Thong Cua");
  lcd.setCursor(0, 1);
  lcd.print("Dang khoi dong..");

  // 3. Khởi tạo SPI và module RFID
  SPI.begin();
  mfrc522.PCD_Init();

  // 4. Kết nối Wi-Fi với cơ chế tự động phục hồi
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  WiFi.setAutoReconnect(true); // Ép module Wi-Fi tự kết nối lại nếu rớt mạng
  WiFi.persistent(true);       // Lưu thông tin Wi-Fi vào bộ nhớ Flash
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  
  // 5. Đồng bộ thời gian với máy chủ Google NTP
  lcd.clear();
  lcd.print("Dong bo Gio...");
  configTime(gmtOffset_sec, daylightOffset_sec, "vn.pool.ntp.org", "time.google.com", "time.windows.com");
  
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    delay(1000); // Chờ đến khi lấy được giờ chuẩn
  }
  
  // 6. Cấu hình và kết nối Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  //config.signer.test_mode = true; // Dùng chế độ test để không cần xác thực token rườm rà
  auth.user.email = "esp32@homestay.com"; 
  auth.user.password = "123456";
  
  fbdo.setBSSLBufferSize(2048, 1024); // Cấp phát bộ nhớ đệm cho SSL
  fbdo.setResponseSize(2048);

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // 7. Thiết lập trạng thái an toàn ban đầu lên Cloud
  Firebase.RTDB.setString(&fbdo, REMOTE_CMD_PATH, "NONE");
  Firebase.RTDB.setString(&fbdo, ALERT_PATH, "AN_TOAN");
  Firebase.RTDB.setBool(&fbdo, PIN_DISABLED_PATH, false);
  Firebase.RTDB.setBool(&fbdo, RFID_DISABLED_PATH, false);
  
  resetLCD(); // Sẵn sàng đón khách
}

// ================= VÒNG LẶP CHÍNH (MAIN LOOP) =================
void loop() {
  // Lấy mốc thời gian duy nhất cho toàn bộ chu kỳ quét (Tối ưu RAM)
  unsigned long currentMillis = millis();

  // ------------------------------------------------------------
  // KHỐI 1: GIÁM SÁT VÀ PHỤC HỒI KẾT NỐI WI-FI CHỦ ĐỘNG
  // ------------------------------------------------------------
  if ((WiFi.status() != WL_CONNECTED) && (currentMillis - previousWiFiMillis >= wifiCheckInterval)) {
    Serial.println("[CẢNH BÁO] Rớt mạng Wi-Fi! Đang thử kết nối lại...");
    WiFi.disconnect();
    WiFi.reconnect(); 
    previousWiFiMillis = currentMillis;
  }
  
  // ------------------------------------------------------------
  // KHỐI 2: ĐỌC LỆNH TỪ FIREBASE (Chu kỳ 2 giây)
  // ------------------------------------------------------------
  if (currentMillis - lastRemoteCheck > 2000) {
    lastRemoteCheck = currentMillis; // Cập nhật lại mốc thời gian
    
    // A. Kiểm tra lệnh mở khóa khẩn cấp từ Web Admin
    if (Firebase.RTDB.getString(&fbdo, REMOTE_CMD_PATH)) {
      String command = fbdo.stringData();
      if (command == "OPEN") {
        Serial.println("⚠️ NHẬN LỆNH MỞ CHỐT KHẨN CẤP TỪ WEB!");
        lcd.clear();
        lcd.print("  Mo Khan Cap!  ");
        
        digitalWrite(RELAY_PIN, HIGH); // Mở cửa
        delay(5000);                  
        digitalWrite(RELAY_PIN, LOW);  // Tự động đóng lại
        
        // Reset toàn bộ cờ cảnh báo về trạng thái an toàn
        isLockedOut = false;
        wrongAttempts = 0;
        Firebase.RTDB.setString(&fbdo, REMOTE_CMD_PATH, "NONE");
        Firebase.RTDB.setString(&fbdo, ALERT_PATH, "AN_TOAN");
        resetLCD();
      }
    }

    // B. Kiểm tra lệnh giải phóng cảnh báo (Khi chủ nhà bấm nút trên Web)
    if (Firebase.RTDB.getString(&fbdo, ALERT_PATH)) {
      String alertStatus = fbdo.stringData();
      if (alertStatus == "AN_TOAN" && isLockedOut) {
        isLockedOut = false;
        wrongAttempts = 0;
        Serial.println(">>> ĐÃ ĐƯỢC CHỦ NHÀ GIẢI KHÓA TỪ XA <<<");
        resetLCD();
      }
    }

    // C. Cập nhật trạng thái cho phép/cấm dùng Mã PIN và Thẻ từ
    if (Firebase.RTDB.getBool(&fbdo, PIN_DISABLED_PATH)) pinDisabled = fbdo.boolData();
    if (Firebase.RTDB.getBool(&fbdo, RFID_DISABLED_PATH)) rfidDisabled = fbdo.boolData();
  }

  // ------------------------------------------------------------
  // KHỐI 3: PHONG TỎA HỆ THỐNG KHI PHÁT HIỆN DÒ MÃ
  // ------------------------------------------------------------
  if (isLockedOut) {
    static unsigned long lastLcdAlert = 0;
    if (currentMillis - lastLcdAlert > 2000) { // Chớp màn hình mỗi 2 giây
      lastLcdAlert = currentMillis;
      lcd.clear();
      lcd.print("KHOA AN NINH!");
      lcd.setCursor(0, 1);
      lcd.print("Lien he chu nha");
    }
    return; // Lệnh return sẽ NGẮT TOÀN BỘ code phía dưới (Không quét phím/thẻ nữa)
  }

  // ------------------------------------------------------------
  // KHỐI 4: GỬI NHỊP TIM BÁO ONLINE (Chu kỳ 60 giây)
  // ------------------------------------------------------------
  if (currentMillis - lastPingTime > 60000) {
    lastPingTime = currentMillis;
    unsigned long nowUnix = getCurrentUnixTime();
    if (nowUnix > 0) {
      Firebase.RTDB.setInt(&fbdo, PING_PATH, nowUnix);
    }
  }

  // ------------------------------------------------------------
  // KHỐI 5: GIÁM SÁT CẢM BIẾN CỬA (Ngay lập tức khi có thay đổi)
  // ------------------------------------------------------------
  int currentDoorState = digitalRead(DOOR_SENSOR_PIN);
  if (currentDoorState != lastDoorState) {
    lastDoorState = currentDoorState;
    if (currentDoorState == LOW) { // Hai má từ áp sát nhau
      Firebase.RTDB.setString(&fbdo, DOOR_STATUS_PATH, "CLOSED");
    } else { // Cửa bị hở ra
      Firebase.RTDB.setString(&fbdo, DOOR_STATUS_PATH, "OPEN");
    }
  }

  // ------------------------------------------------------------
  // KHỐI 6: QUÉT VÀ XỬ LÝ BÀN PHÍM MA TRẬN
  // ------------------------------------------------------------
  char key = keypad.getKey();
  if (key) {
    if (pinDisabled) { // Bị chủ nhà khóa tính năng
      lcd.clear();
      lcd.print("CHUC NANG MA PIN");
      lcd.setCursor(0, 1);
      lcd.print("TAM THOI KHOA!");
      delay(2000);
      resetLCD();
    } else {
      if (key == '*') { // Nút XÓA
        inputPIN = "";
        resetLCD();
      } 
      else if (key == '#') { // Nút XÁC NHẬN (Gửi đi kiểm tra)
        if (inputPIN.length() > 0) {
          verifyAccess(inputPIN, false); // false = Đang dùng PIN
          inputPIN = ""; 
          if(!isLockedOut) resetLCD();
        }
      } 
      else { // Nhập số
        inputPIN += key;
        lcd.setCursor(inputPIN.length() - 1, 1);
        lcd.print("*"); // Che dấu mật khẩu
      }
    }
  }

  // ------------------------------------------------------------
  // KHỐI 7: QUÉT VÀ XỬ LÝ THẺ TỪ RFID
  // ------------------------------------------------------------
  if (mfrc522.PICC_IsNewCardPresent()) { // Nếu có thẻ đưa vào
    if (mfrc522.PICC_ReadCardSerial()) { // Đọc thành công
      if (rfidDisabled) { 
        lcd.clear();
        lcd.print("CHUC NANG RFID");
        lcd.setCursor(0, 1);
        lcd.print("TAM THOI KHOA!");
        delay(2000);
      } else {
        String rfidUID = "";
        // Chuyển mảng byte của UID thành chuỗi Hex string
        for (byte i = 0; i < mfrc522.uid.size; i++) {
          rfidUID += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
          rfidUID += String(mfrc522.uid.uidByte[i], HEX);
        }
        rfidUID.toUpperCase(); // In hoa cho đồng bộ với Web
        
        mfrc522.PICC_HaltA();       // Dừng đọc thẻ hiện tại
        mfrc522.PCD_StopCrypto1();  // Giải phóng mã hóa
        
        verifyAccess(rfidUID, true); // true = Đang dùng RFID
      }
    }
    mfrc522.PCD_Init(); // Reset lại module thẻ để đọc lần tiếp theo
    if(!isLockedOut) resetLCD();
  }
}

// ================= HÀM XỬ LÝ LÕI: KIỂM TRA QUYỀN TRUY CẬP =================
void verifyAccess(String credentials, bool isRFID) {
  lcd.clear();
  lcd.print("Dang kiem tra...");
  
  // 1. Chống hack thời gian ảo (Đảm bảo NTP đã đồng bộ)
  unsigned long currentTime = getCurrentUnixTime();
  if (currentTime < 1600000000) { 
    lcd.setCursor(0, 1);
    lcd.print("Loi Time Server!");
    delay(2000);
    return;
  }

  // 2. Kéo toàn bộ danh sách phòng từ Firebase về để đối chiếu
  if (Firebase.RTDB.getJSON(&fbdo, ROOM_PATH)) {
    String jsonStr = fbdo.stringData();
    DynamicJsonDocument doc(2048); // Khởi tạo bộ nhớ đệm cho JSON
    deserializeJson(doc, jsonStr);

    JsonObject bookings = doc.as<JsonObject>();
    bool isAuthorized = false;
    bool requirePinFirst = false;
    String matchedBookingKey = ""; 

    // 3. Vòng lặp quét từng đơn đặt phòng
    for (JsonPair kv : bookings) {
      JsonObject booking = kv.value();
      String bookingKey = kv.key().c_str(); 
      unsigned long startTime = booking["start_time"].as<unsigned long>();
      unsigned long endTime = booking["end_time"].as<unsigned long>();
      
      // A. Kiểm tra tính hợp lệ của Thời gian (Chỉ khách đang trong giờ thuê mới được xét duyệt)
      if (currentTime >= startTime && currentTime <= endTime) {
        bool isCheckedIn = booking.containsKey("is_checked_in") ? booking["is_checked_in"].as<bool>() : false;

        // B. Phân nhánh RFID
        if (isRFID) {
          String dbUID = booking["rfid_uid"].as<String>();
          bool isRfidActive = booking["is_rfid_active"].as<bool>();
          if (dbUID == credentials && isRfidActive) {
            if (isCheckedIn) isAuthorized = true; // Phải nhập PIN lần 1 rồi mới được xài thẻ
            else requirePinFirst = true;
            break;
          }
        } 
        // C. Phân nhánh MÃ PIN
        else {
          String dbPin = booking["pin"].as<String>();
          bool isPinActive = booking["is_pin_active"].as<bool>();
          if (dbPin == credentials && isPinActive) {
            isAuthorized = true;
            matchedBookingKey = bookingKey; // Lưu lại ID phòng để đổi cờ Check-in
            break;
          }
        }
      }
    }

    // 4. Xử lý logic hậu kiểm tra
    if (isAuthorized) {
      // MỞ CỬA THÀNH CÔNG
      wrongAttempts = 0; // Reset số lần sai
      Firebase.RTDB.setString(&fbdo, ALERT_PATH, "AN_TOAN");
      
      lcd.clear();
      lcd.print("  Cua Da Mo!  ");
      
      // Nếu là lần đầu mở bằng PIN, bật cờ Check-in lên Cloud
      if (!isRFID && matchedBookingKey != "") {
        String updatePath = String(ROOM_PATH) + "/" + matchedBookingKey + "/is_checked_in";
        Firebase.RTDB.setBool(&fbdo, updatePath, true);
      }

      digitalWrite(RELAY_PIN, HIGH); // Hút chốt
      delay(5000);                   // Đợi khách đẩy cửa vào
      digitalWrite(RELAY_PIN, LOW);  // Nhả chốt
      
    } else if (requirePinFirst) {
      // Lỗi cầm thẻ quẹt trước khi nhận phòng bằng PIN
      lcd.clear();
      lcd.print("Chua Check-in!");
      lcd.setCursor(0, 1);
      lcd.print("Nhap PIN truoc");
      delay(3000);
    } else {
      // CẢNH BÁO: TỪ CHỐI TRUY CẬP (SAI MÃ)
      wrongAttempts++;
      if (wrongAttempts >= 5) {
        isLockedOut = true; // Khóa cứng phần cứng
        
        // Bắn tín hiệu lên mạng để Web Admin hú còi
        Firebase.RTDB.setString(&fbdo, ALERT_PATH, "DO_MA_PIN"); 
        
        // Gửi Email thông báo cho chủ nhà
        sendEmailAlert("Phòng 01", "Cảnh báo: Phát hiện hành vi dò mã PIN nhiều lần. Hệ thống đã khóa cứng!");
        
        lcd.clear();
        lcd.print("DO MA PHAT HIEN!");
        lcd.setCursor(0, 1);
        lcd.print("KHOA HE THONG!");
        delay(3000);
      } else {
        // Cảnh cáo nhẹ
        lcd.clear();
        lcd.print(" Tu Choi Vao! ");
        lcd.setCursor(0, 1);
        lcd.print("Sai: " + String(wrongAttempts) + "/5 lan");
        delay(3000);
      }
    }
  }
}

// ================= HÀM GỬI EMAIL CẢNH BÁO BẰNG API =================
void sendEmailAlert(String roomName, String alertMessage) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // API của EmailJS
    http.begin("https://api.emailjs.com/api/v1.0/email/send");
    http.addHeader("Content-Type", "application/json");
    
    // Header giả mạo trình duyệt để qua mặt CORS của API
    http.addHeader("Origin", "http://localhost"); 

    // Build chuỗi JSON chứa nội dung gửi (Thay bằng các thông số thực tế của bạn)
    String payload = "{\"service_id\":\"service_2xtdacn\",\"template_id\":\"template_jyv975c\",\"user_id\":\"SkCLdJxsQ-gnvraJb\",\"template_params\":{\"room_name\":\"" + roomName + "\",\"message\":\"" + alertMessage + "\"}}";

    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode == 200) {
      Serial.println("Đã gửi Email báo động thành công! Mã: 200");
    } else {
      Serial.print("Lỗi khi gửi Email: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("Không có mạng, không thể gửi Email!");
  }
}

// ================= HÀM HIỂN THỊ CHUẨN BỊ (RESET GIAO DIỆN) =================
void resetLCD() {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("PIN hoac the...");
  // Khởi động lại anten RFID để sẵn sàng nhận thẻ mới
  mfrc522.PCD_Init();
  mfrc522.PCD_SetAntennaGain(mfrc522.RxGain_max);
}
