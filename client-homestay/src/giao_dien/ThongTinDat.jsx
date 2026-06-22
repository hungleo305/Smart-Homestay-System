import { calculatePrice } from '../du_lieu/cau_hinh';

export default function ThongTinDat({ formData, setFormData, selectedRoom, minDateTime, bookedSlots, setCurrentView, handleProceedToPayment, isProcessing }) {
  const liveCalculatedTotal = calculatePrice(formData.checkIn, formData.checkOut, selectedRoom.price);

  return (
    <div className="checkout-container">
      <button className="btn-outline" onClick={() => setCurrentView('detail')} style={{marginBottom: '20px'}}>← Trở về trang trước</button>
      <h2>Hoàn tất thông tin đặt phòng</h2>
      <p style={{color: '#666', marginBottom: '30px'}}>Phòng: <strong>{selectedRoom.name}</strong></p>

      {bookedSlots.length > 0 && (
        <div style={{backgroundColor: '#fff3cd', color: '#856404', padding: '15px 20px', borderRadius: '5px', marginBottom: '25px', borderLeft: '5px solid #ffeeba'}}>
          ⚠️ <strong>Lưu ý tránh trùng lịch:</strong> Hiện tại phòng đã có lịch đặt kín. Vui lòng xem danh sách các ngày đã báo ở trang trước để chọn thời gian hợp lý!
        </div>
      )}

      <form onSubmit={handleProceedToPayment}>
        <div className="form-grid">
          <div className="form-group" style={{gridColumn: '1 / -1'}}>
            <label>Họ và tên người lưu trú *</label>
            <input type="text" className="form-input" required placeholder="Vd: Nguyễn Văn A" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div className="form-group">
            <label>Số điện thoại *</label>
            <input type="tel" className="form-input" required placeholder="Ví dụ: 0987654321" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          </div> 
          <div className="form-group">
            <label>Xác nhận Số điện thoại *</label>
            <input type="tel" className="form-input" required placeholder="Nhập lại số điện thoại" value={formData.confirmPhone} onChange={e => setFormData({...formData, confirmPhone: e.target.value})} />
          </div> 

          <div className="form-group">
            <label>Địa chỉ Email (Nhận mã PIN) *</label>
            <input type="email" className="form-input" required placeholder="email@gmail.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Xác nhận Email *</label>
            <input type="email" className="form-input" required placeholder="Nhập lại Email" value={formData.confirmEmail} onChange={e => setFormData({...formData, confirmEmail: e.target.value})} />
          </div> 
          
          <div className="form-group">
            <label>Thời gian nhận phòng (Check-in) *</label>
            <input type="datetime-local" className="form-input" min={minDateTime} required value={formData.checkIn} onChange={e => setFormData({...formData, checkIn: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Thời gian trả phòng (Check-out) *</label>
            <input type="datetime-local" className="form-input" min={formData.checkIn || minDateTime} required value={formData.checkOut} onChange={e => setFormData({...formData, checkOut: e.target.value})} />
          </div>
        </div>

        <div style={{marginTop: '40px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'right'}}>
          <p style={{fontSize: '18px'}}>Tổng thanh toán: <strong style={{color: '#d9534f', fontSize: '24px'}}>{liveCalculatedTotal.toLocaleString('vi-VN')} VND</strong></p>
          <button type="submit" className="btn-primary" style={{marginTop: '15px', padding: '15px 30px'}} disabled={isProcessing}>
            {isProcessing ? 'Đang kiểm tra dữ liệu...' : 'Tiến hành thanh toán'}
          </button>
        </div>
      </form>
    </div>
  );
}