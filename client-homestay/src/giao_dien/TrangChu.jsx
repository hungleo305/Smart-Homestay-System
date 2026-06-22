export default function TrangChu({ ROOMS, viewRoomDetail }) {
  return (
    <div>
      <div className="hero-section">
        <h2>Smart Homestay</h2>
        <p>Hệ thống lưu trú thông minh đầu tiên tại Hà Nội. Tự động hóa trải nghiệm nhận/trả phòng của bạn với công nghệ bảo mật không chạm.</p>
      </div>
      
      <div className="features-section">
        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon">📱</div>
            <h4>Tự Động 100%</h4>
            <p>Không cần chờ đợi lễ tân. Nhận mã PIN và mở cửa phòng ngay lập tức bất kể ngày đêm.</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">🔐</div>
            <h4>Bảo Mật Tối Đa</h4>
            <p>Mã PIN được cấp phát ngẫu nhiên, tự động hủy bỏ ngay khi thời gian Check-out kết thúc.</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">✨</div>
            <h4>Tiêu Chuẩn 5 Sao</h4>
            <p>Phòng ốc luôn được vệ sinh sát khuẩn, đầy đủ tiện nghi cho kỳ nghỉ hoàn hảo.</p>
          </div>
        </div>
      </div>

      <div className="container">
        <h3 className="section-title">Các Phòng Hà Nội</h3>
        <div className="room-grid">
          {ROOMS.map(room => (
            <div key={room.id} className="room-card" onClick={() => viewRoomDetail(room)}>
              <img src={room.images[0]} alt={room.name} className="room-img-main" />
              <div className="room-card-info">
                <h3 className="room-card-title">{room.name}</h3>
                <p style={{color: '#666', marginBottom: '10px'}}>{room.shortDesc}</p>
                <div className="room-card-price">{room.price.toLocaleString('vi-VN')} VND / Đêm</div>
                <div style={{display: 'flex', justifyContent: 'space-between', color: '#555'}}>
                  <span>⭐ {room.rating}</span>
                  <span>{room.capacity.split('·')[0]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}