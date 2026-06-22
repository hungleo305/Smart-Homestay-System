import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { ref, onValue, set } from "firebase/database";
import { auth, db } from "./firebase";
import { useNavigate } from "react-router-dom";
// Nhớ cài thư viện này bên app Admin: npm install react-hot-toast
import toast, { Toaster } from 'react-hot-toast';
import { 
  Home, Users, Key, TrendingUp, LogOut, AlertTriangle, 
  Search, RefreshCw, X, Wifi, WifiOff, Shield, ShieldAlert, Sliders 
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [roomsStatus, setRoomsStatus] = useState([]); 
  const [systemAlerts, setSystemAlerts] = useState([]); 
  
  // Ref để lưu trữ những phòng ĐÃ BÁO ĐỘNG (Chống spam hú còi liên tục)
  const notifiedRooms = useRef(new Set());

  const [controlModal, setControlModal] = useState({
    isOpen: false,
    roomId: "",
    roomLabel: "",
    pinDisabled: false,
    rfidDisabled: false,
    status: "idle",
    message: ""
  });

  const now = Math.floor(Date.now() / 1000);

  const totalGuests = guests.length;
  const stayingGuests = guests.filter(g => g.startTime <= now && now <= g.endTime).length;
  const incomingGuests = guests.filter(g => now < g.startTime).length;
  const totalRevenue = guests.reduce((sum, g) => sum + (g.price || 0), 0);

  const formatTime = (timestamp) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp * 1000); 
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${hours}:${minutes} - ${day}/${month}`;
  };

  const fetchGuestsData = () => {
    const dbRef = ref(db, 'homestay'); 
    
    onValue(dbRef, (snapshot) => {
      const roomsData = snapshot.val();
      if (!roomsData) {
        setGuests([]);
        setRoomsStatus([]);
        setSystemAlerts([]);
        return;
      }

      const allGuests = [];
      const extractedRooms = [];
      const newAlerts = [];
      const currentTime = Math.floor(Date.now() / 1000);

      for (const [roomId, roomData] of Object.entries(roomsData)) {
        const roomLabel = roomId.replace('room_', 'Phòng ').replace('_', ' ');
        
        // 1. KIỂM TRA ONLINE/OFFLINE
        const lastPing = roomData.last_ping || 0;
        const isOnline = lastPing > 0 && (currentTime - lastPing < 180); 
        if (!isOnline) {
          newAlerts.push({ type: "OFFLINE", text: `${roomLabel} bị mất kết nối với phần cứng!` });
        }

        // 2. XỬ LÝ CẢNH BÁO DÒ MÃ (CÓ THÔNG BÁO NỔI & HÚ CÒI)
        const alertStatus = roomData.canh_bao || "AN_TOAN";
        if (alertStatus === "DO_MA_PIN") {
          newAlerts.push({ type: "DANGER", text: `Phát hiện hành vi DÒ MÃ PIN liên tiếp tại ${roomLabel}!` });
          
          // Kiểm tra xem đã báo động cho phòng này chưa để tránh spam
          if (!notifiedRooms.current.has(roomId)) {
            // A. Hiện Bong bóng Toast trong web
            toast.error(`CẢNH BÁO: Phát hiện dò mã PIN tại ${roomLabel}!`, {
              duration: 10000,
              position: 'top-right',
              style: { padding: '16px', background: '#7f1d1d', color: '#fff', fontWeight: 'bold' },
            });

            // B. Phát âm thanh còi hú
            const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
            audio.play().catch(() => {});

            // C. Bắn thông báo đẩy của Hệ điều hành (Web Notification)
            if (Notification.permission === "granted") {
              new Notification("🚨 CẢNH BÁO AN NINH KHẨN CẤP", {
                body: `Phần cứng tại ${roomLabel} đang bị dò mã số. Hệ thống đã khóa cứng!`,
                icon: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
                silent: true // Tắt tiếng notification mặc định vì đã có còi hú ở trên
              });
            }

            // Ghi nhớ là đã báo động
            notifiedRooms.current.add(roomId);
          }
        } else {
          // Xóa khỏi danh sách báo động nếu trạng thái đã an toàn
          notifiedRooms.current.delete(roomId);
        }

        // 3. THU THẬP TRẠNG THÁI THIẾT BỊ
        extractedRooms.push({
          id: roomId,
          label: roomLabel,
          doorOpen: roomData.door_status === 'OPEN',
          isOnline: isOnline,
          alertStatus: alertStatus,
          pinDisabled: roomData.pin_disabled || false, 
          rfidDisabled: roomData.rfid_disabled || false  
        });

        // 4. THU THẬP DANH SÁCH ĐẶT PHÒNG
        const bookings = roomData.bookings || {};
        for (const [bookingId, b] of Object.entries(bookings)) {
          allGuests.push({
            bookingId: bookingId,
            roomId: roomId,
            roomLabel: roomLabel,
            name: b.customer_name || '—',
            phone: b.customer_phone || '—',
            email: b.customer_email || '',
            pin: b.pin || '—',
            startTime: b.start_time || 0,
            endTime: b.end_time || 0,
            price: b.price || null,
            doorOpen: roomData.door_status === 'OPEN'
          });
        }
      }

      const order = (g) => {
        if (g.startTime <= currentTime && currentTime <= g.endTime) return 0; 
        if (currentTime < g.startTime) return 1; 
        return 2; 
      };
      allGuests.sort((a, b) => {
        const so = order(a) - order(b);
        return so !== 0 ? so : b.startTime - a.startTime;
      });

      setGuests(allGuests);
      setRoomsStatus(extractedRooms);
      setSystemAlerts(newAlerts);
    });
  };

  useEffect(() => {
    fetchGuestsData();
    
    // Xin quyền hiển thị Thông báo hệ thống ngay khi Admin vào trang
    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    const timer = setInterval(() => {
      setGuests(prevGuests => [...prevGuests]); 
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleOpenControl = (room) => {
    setControlModal({
      isOpen: true,
      roomId: room.id,
      roomLabel: room.label,
      pinDisabled: room.pinDisabled,
      rfidDisabled: room.rfidDisabled,
      status: "idle",
      message: ""
    });
  };

  const handleUpdateSecurityToggle = (type, currentValue) => {
    const newValue = !currentValue;
    const targetPath = `homestay/${controlModal.roomId}/${type}_disabled`;
    
    set(ref(db, targetPath), newValue)
      .then(() => {
        toast.success(`Đã ${newValue ? "KHÓA" : "MỞ KHÓA"} tính năng thành công!`);
        setControlModal(prev => ({ ...prev, [type + "Disabled"]: newValue }));
      })
      .catch(err => {
        toast.error("Lỗi: " + err.message);
        setControlModal(prev => ({ ...prev, message: "Lỗi: " + err.message }));
      });
  };

  const handleExecuteEmergency = () => {
    setControlModal(prev => ({ ...prev, status: "loading", message: "Đang gửi lệnh mở cửa..." }));
    
    set(ref(db, `homestay/${controlModal.roomId}/remote_command`), "OPEN")
      .then(() => {
        // Đồng thời reset luôn biến cảnh báo trên Firebase về AN_TOAN
        set(ref(db, `homestay/${controlModal.roomId}/canh_bao`), "AN_TOAN");
        
        toast.success("Đã kích hoạt mở chốt và xóa báo động!");
        setControlModal(prev => ({ ...prev, status: "success", message: "Đã kích hoạt mở chốt từ xa!" }));
        setTimeout(() => setControlModal(prev => ({ ...prev, isOpen: false })), 1500);
      })
      .catch(err => {
        toast.error("Lỗi: " + err.message);
        setControlModal(prev => ({ ...prev, status: "error", message: "Lỗi: " + err.message }));
      });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-200 p-6 font-sans relative">
      
      {/* KHAI BÁO COMPONENT TOAST BẮT BUỘC ĐỂ HIỆN BONG BÓNG */}
      <Toaster />

      {/* 🛑 KHỐI BANNER THÔNG BÁO CẢNH BÁO NGUY HIỂM TỰ ĐỘNG */}
      {systemAlerts.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {systemAlerts.map((alert, idx) => (
            <div key={idx} className={`border-2 p-4 rounded-xl animate-pulse flex items-center gap-3 text-white shadow-lg ${
              alert.type === "DANGER" 
                ? "bg-red-950 border-red-500 shadow-red-500/20" 
                : "bg-amber-950 border-amber-600 shadow-amber-500/10"
            }`}>
              <AlertTriangle className={alert.type === "DANGER" ? "text-red-400" : "text-amber-500"} size={26} />
              <div>
                <h4 className="font-bold text-base">HỆ THỐNG PHÁT HIỆN SỰ CỐ!</h4>
                <p className="text-sm opacity-90">{alert.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎛️ MODAL ĐIỀU KHIỂN BẢO MẬT PHÒNG TỪ XA */}
      {controlModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#252525] p-6 rounded-xl border border-gray-700 w-[420px] shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="text-blue-500" size={22} />
                Cấu hình: {controlModal.roomLabel}
              </h3>
              <button onClick={() => setControlModal(prev => ({...prev, isOpen: false}))} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mb-6">Chủ nhà có quyền can thiệp, khóa hoặc cho phép thiết bị phần cứng tại phòng thực hiện các chức năng cụ thể.</p>

            <div className="flex flex-col gap-4 mb-6">
              <div className="flex justify-between items-center bg-[#1e1e1e] p-4 rounded-lg border border-gray-800">
                <div>
                  <h4 className="font-semibold text-sm text-white">Xác thực mã PIN bằn bàn phím</h4>
                  <p className="text-xs text-gray-500">Tạm dừng quyền mở khóa bằng mã số</p>
                </div>
                <button 
                  onClick={() => handleUpdateSecurityToggle("pin", controlModal.pinDisabled)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    controlModal.pinDisabled ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {controlModal.pinDisabled ? "ĐANG KHÓA" : "ĐANG BẬT"}
                </button>
              </div>

              <div className="flex justify-between items-center bg-[#1e1e1e] p-4 rounded-lg border border-gray-800">
                <div>
                  <h4 className="font-semibold text-sm text-white">Xác thực thẻ từ RFID</h4>
                  <p className="text-xs text-gray-500">Tạm dừng quyền quẹt thẻ từ vật lý</p>
                </div>
                <button 
                  onClick={() => handleUpdateSecurityToggle("rfid", controlModal.rfidDisabled)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    controlModal.rfidDisabled ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {controlModal.rfidDisabled ? "ĐANG KHÓA" : "ĐANG BẬT"}
                </button>
              </div>
            </div>

            {controlModal.message && (
              <div className="bg-[#1a1a1a] p-3 text-center rounded-lg border border-gray-800 text-xs text-yellow-400 font-medium mb-4">
                {controlModal.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExecuteEmergency}
                disabled={controlModal.status === "loading"}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-600/10"
              >
                <AlertTriangle size={16} /> Mở chốt & Giải khóa
              </button>
              <button 
                onClick={() => setControlModal(prev => ({...prev, isOpen: false}))}
                className="bg-[#333] hover:bg-[#444] text-white text-sm font-medium p-3 rounded-lg transition-colors"
              >
                Đóng bảng điều khiển
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8 bg-[#252525] p-4 rounded-xl border border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg"><Home className="text-black" size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-white">Homestay Manager</h1>
            <p className="text-xs text-gray-400">Quản lý khách lưu trú & Trung tâm An ninh IoT</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-gray-300 hover:text-white px-4 py-2 transition-colors">
          <LogOut size={18} /> Đăng xuất
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Users />} title="Tổng khách" value={totalGuests} />
        <StatCard icon={<Home className="text-green-500" />} title="Đang ở" value={stayingGuests} />
        <StatCard icon={<Key className="text-blue-500" />} title="Sắp nhận" value={incomingGuests} />
        <StatCard 
          icon={<TrendingUp className="text-yellow-500" />} 
          title="Tổng thu nhập" 
          value={`${new Intl.NumberFormat('vi-VN').format(totalRevenue)} ₫`} 
          valueColor="text-yellow-500" 
        />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sliders size={20} className="text-gray-400" /> Giám sát phần cứng & Quyền truy cập phòng
        </h2>
        <div className="grid grid-cols-3 gap-6">
          {roomsStatus.map((room) => (
            <div key={room.id} className="bg-[#252525] border border-gray-700 rounded-xl p-5 flex flex-col justify-between shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-base">{room.label}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1 ${
                    room.isOnline ? "bg-green-950 text-green-400 border border-green-800" : "bg-gray-800 text-gray-400 border border-gray-700"
                  }`}>
                    {room.isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {room.isOnline ? "Online" : "Mất kết nối"}
                  </span>
                </div>
                <button 
                  onClick={() => handleOpenControl(room)}
                  className="bg-[#333] hover:bg-gray-700 border border-gray-600 p-2 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium text-gray-200"
                >
                  <Sliders size={14} /> Cấu hình
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#1a1a1a] p-3 rounded-lg border border-gray-800 text-center text-xs">
                <div>
                  <p className="text-gray-500 mb-1">Cửa phòng</p>
                  <p className={`font-bold ${room.doorOpen ? "text-orange-400" : "text-green-400"}`}>
                    {room.doorOpen ? "ĐANG MỞ" : "ĐÃ ĐÓNG"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Phím số</p>
                  <p className={`font-bold ${room.pinDisabled ? "text-red-500" : "text-green-400"}`}>
                    {room.pinDisabled ? "KHÓA" : "MỞ"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Thẻ từ</p>
                  <p className={`font-bold ${room.rfidDisabled ? "text-red-500" : "text-green-400"}`}>
                    {room.rfidDisabled ? "KHÓA" : "MỞ"}
                  </p>
                </div>
              </div>

              {room.alertStatus === "DO_MA_PIN" && (
                <div className="mt-3 bg-red-950/50 border border-red-800/80 p-2 rounded-lg text-xs text-red-400 font-semibold flex items-center gap-1.5 justify-center animate-pulse">
                  <ShieldAlert size={14} /> Cảnh báo: Đang bị dò mã!
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#252525] rounded-xl border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white">Danh sách khách lưu trú</h2>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input type="text" placeholder="Tìm tên, phòng, PIN..." className="bg-[#1a1a1a] border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-gray-400 w-64" />
            </div>
            <button onClick={fetchGuestsData} className="flex items-center gap-2 bg-[#1a1a1a] border border-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm transition-colors">
              <RefreshCw size={16} /> Làm mới
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-sm text-gray-400 border-b border-gray-700">
                <th className="pb-3 font-semibold">Tên khách</th>
                <th className="pb-3 font-semibold">Số điện thoại</th>
                <th className="pb-3 font-semibold">Phòng</th>
                <th className="pb-3 font-semibold">Mã PIN</th>
                <th className="pb-3 font-semibold">Giá tiền</th>
                <th className="pb-3 font-semibold">Giờ Check-in</th>
                <th className="pb-3 font-semibold">Giờ Check-out</th>
                <th className="pb-3 font-semibold">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {guests.length > 0 ? (
                guests.map((guest) => {
                  let trangThai = "Đã trả";
                  let colorClass = "text-gray-500"; 

                  if (guest.startTime <= now && now <= guest.endTime) {
                    trangThai = "Đang ở";
                    colorClass = "text-green-400"; 
                  } else if (now < guest.startTime) {
                    trangThai = "Sắp nhận";
                    colorClass = "text-blue-400"; 
                  }

                  return (
                    <tr key={guest.bookingId} className="border-b border-gray-700/50 hover:bg-[#303030] transition-colors">
                      <td className="py-4 font-medium text-white">{guest.name}</td>
                      <td className="py-4 text-gray-400">{guest.phone}</td>
                      <td className="py-4 text-gray-400">{guest.roomLabel}</td>
                      <td className="py-4 font-bold text-white tracking-widest">{guest.pin}</td>
                      <td className="py-4 font-bold text-white">
                        {guest.price ? new Intl.NumberFormat('vi-VN').format(guest.price) + ' ₫' : '—'}
                      </td>
                      <td className="py-4 text-gray-400 text-sm whitespace-nowrap">{formatTime(guest.startTime)}</td>
                      <td className="py-4 text-gray-400 text-sm whitespace-nowrap">{formatTime(guest.endTime)}</td>
                      <td className={`py-4 text-sm font-medium ${colorClass}`}>
                        {trangThai}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500">
                    Đang tải dữ liệu hoặc không có lịch sử khách hàng...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, valueColor = "text-white" }) {
  return (
    <div className="bg-[#252525] p-5 rounded-xl border border-gray-700 flex items-center gap-4">
      <div className="bg-[#333] p-3 rounded-lg text-gray-400">{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}