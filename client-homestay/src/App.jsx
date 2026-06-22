import { useState, useEffect } from 'react';
import { ref, set, get, child, push } from "firebase/database";
import { database } from "./firebase";
import emailjs from '@emailjs/browser'; 
import './App.css';

// Import cấu hình
import { ROOMS, INITIAL_FORM_STATE, calculatePrice } from './du_lieu/cau_hinh';

// Import các thành phần giao diện
import Header from './thanh_phan/Header';
import Footer from './thanh_phan/Footer';
import TrangChu from './giao_dien/TrangChu';
import ChiTietPhong from './giao_dien/ChiTietPhong';
import ThongTinDat from './giao_dien/ThongTinDat';
import ThanhToan from './giao_dien/ThanhToan';
import ThanhCong from './giao_dien/ThanhCong';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [minDateTime, setMinDateTime] = useState('');
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [bookedSlots, setBookedSlots] = useState([]);
  
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTime(now.toISOString().slice(0, 16));

    const autoCleanFirebase = async () => {
      try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'homestay'));
        if (snapshot.exists()) {
          const allRooms = snapshot.val();
          const currentTime = Math.floor(Date.now() / 1000);
          
          for (const roomId in allRooms) {
            const roomData = allRooms[roomId];
            if (roomData.bookings) {
              for (const bookingId in roomData.bookings) {
                const booking = roomData.bookings[bookingId];
                if (booking.is_pin_active && booking.end_time && currentTime > booking.end_time) {
                  set(ref(database, `homestay/${roomId}/bookings/${bookingId}/is_pin_active`), false);
                  set(ref(database, `homestay/${roomId}/bookings/${bookingId}/pin`), "EXPIRED"); 
                }
              }
            }
          }
        }
      } catch (err) { console.error(err); }
    };
    autoCleanFirebase();
  }, []);

  const goHome = () => { 
    setCurrentView('home'); 
    setSelectedRoom(null); 
    setPin(''); 
    setFormData(INITIAL_FORM_STATE); 
    setBookedSlots([]); 
  };

  const viewRoomDetail = async (room) => { 
    setSelectedRoom(room); 
    setCurrentView('detail'); 
    setFormData(INITIAL_FORM_STATE); 
    setBookedSlots([]);

    try {
      const roomRef = ref(database, `homestay/${room.id}/bookings`);
      const snapshot = await get(roomRef);
      if (snapshot.exists()) {
        const bookings = snapshot.val();
        const currentTime = Math.floor(Date.now() / 1000);
        const activeSlots = [];
        
        for (const key in bookings) {
          const data = bookings[key];
          if (data.is_pin_active && data.end_time > currentTime) {
            activeSlots.push({
              startStr: new Date(data.start_time * 1000).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
              endStr: new Date(data.end_time * 1000).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
            });
          }
        }
        setBookedSlots(activeSlots);
      }
    } catch (error) {
      console.error("Không lấy được lịch Firebase: ", error);
    }
  };

  const goToCheckout = () => { setCurrentView('checkout'); };

  const handleProceedToPayment = async (e) => {
    e.preventDefault();

    const newStartTimeUnix = Math.floor(new Date(formData.checkIn).getTime() / 1000);
    const newEndTimeUnix = Math.floor(new Date(formData.checkOut).getTime() / 1000);

    if (newStartTimeUnix >= newEndTimeUnix) {
      alert("Lỗi: Thời gian Trả phòng phải sau thời gian Nhận phòng!"); return;
    }

    const total = calculatePrice(formData.checkIn, formData.checkOut, selectedRoom.price);
    setFormData({...formData, totalPrice: total});
    setIsProcessing(true);

    try {
      const roomRef = ref(database, `homestay/${selectedRoom.id}/bookings`);
      const snapshot = await get(roomRef);

      if (snapshot.exists()) {
        const bookings = snapshot.val();
        for (const key in bookings) {
          const data = bookings[key];
          if (data.is_pin_active && newStartTimeUnix < data.end_time && newEndTimeUnix > data.start_time) {
            const bookedStart = new Date(data.start_time * 1000).toLocaleString('vi-VN');
            const bookedEnd = new Date(data.end_time * 1000).toLocaleString('vi-VN');
            alert(`⚠️ Lỗi: Khoảng thời gian này bị trùng với một khách đã đặt từ ${bookedStart} đến ${bookedEnd}. Vui lòng chọn lịch khác!`);
            setIsProcessing(false);
            return;
          }
        }
      }

      setCurrentView('payment');
      setIsProcessing(false);
    } catch (error) {
      alert("Lỗi kết nối máy chủ: " + error.message);
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = () => {
    setIsProcessing(true);

    const startTimeUnix = Math.floor(new Date(formData.checkIn).getTime() / 1000);
    const endTimeUnix = Math.floor(new Date(formData.checkOut).getTime() / 1000);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();

    const newBookingRef = push(ref(database, `homestay/${selectedRoom.id}/bookings`));
    
    set(newBookingRef, {
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      start_time: startTimeUnix,
      end_time: endTimeUnix,
      pin: newPin,
      is_pin_active: true,
      price: formData.totalPrice, 
      rfid_uid: "445EFA05",
      is_rfid_active: true
    })
    .then(() => {
      const templateParams = {
        to_email: formData.email,
        to_name: formData.name,
        room_name: selectedRoom.name,
        pin_code: newPin,
        check_in: new Date(formData.checkIn).toLocaleString('vi-VN'),
        check_out: new Date(formData.checkOut).toLocaleString('vi-VN')
      };

      emailjs.send('service_2xtdacn', 'template_1tvepl7', templateParams, 'SkCLdJxsQ-gnvraJb')
        .then(() => {
           setPin(newPin);
           setCurrentView('success');
           setIsProcessing(false);
        }, (error) => {
           console.log('Lỗi gửi email:', error);
           alert('Đã lưu dữ liệu nhưng có lỗi khi gửi email.');
           setPin(newPin);
           setCurrentView('success');
           setIsProcessing(false);
        });
    })
    .catch((error) => {
      alert('Lỗi lưu Firebase: ' + error.message);
      setIsProcessing(false);
    });
  };

  return (
    <div>
      <Header goHome={goHome} />
      
      <main style={{ minHeight: '80vh' }}>
        {currentView === 'home' && <TrangChu ROOMS={ROOMS} viewRoomDetail={viewRoomDetail} />}
        {currentView === 'detail' && <ChiTietPhong selectedRoom={selectedRoom} bookedSlots={bookedSlots} goHome={goHome} goToCheckout={goToCheckout} />}
        {currentView === 'checkout' && <ThongTinDat formData={formData} setFormData={setFormData} selectedRoom={selectedRoom} minDateTime={minDateTime} bookedSlots={bookedSlots} setCurrentView={setCurrentView} handleProceedToPayment={handleProceedToPayment} isProcessing={isProcessing} />}
        {currentView === 'payment' && <ThanhToan formData={formData} setCurrentView={setCurrentView} handleConfirmPayment={handleConfirmPayment} isProcessing={isProcessing} />}
        {currentView === 'success' && <ThanhCong formData={formData} pin={pin} goHome={goHome} />}
      </main>

      <Footer />
    </div>
  );
}

export default App;