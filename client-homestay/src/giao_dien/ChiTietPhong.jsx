export default function ChiTietPhong({ selectedRoom, bookedSlots, goHome, goToCheckout }) {
  return (
    <div className="container">
      <button className="btn-outline" onClick={goHome} style={{marginBottom: '20px'}}>← Quay lại danh sách</button>
      
      {bookedSlots.length > 0 && (
        <div style={{backgroundColor: '#fff3cd', color: '#856404', padding: '15px 20px', borderRadius: '5px', marginBottom: '20px', borderLeft: '5px solid #ffeeba'}}>
          ⚠️ <strong>Lưu ý:</strong> Phòng này đã có khách đặt vào các khung giờ sau:
          <ul style={{marginTop: '10px', marginLeft: '20px', lineHeight: '1.8'}}>
            {bookedSlots.map((slot, idx) => (
              <li key={idx}>Từ <strong>{slot.startStr}</strong> đến <strong>{slot.endStr}</strong></li>
            ))}
          </ul>
        </div>
      )}

      <div className="detail-header">
        <div>
          <h2 style={{fontSize: '32px', color: '#1a1a1a'}}>{selectedRoom.name}</h2>
          <p style={{color: '#666'}}>⭐ {selectedRoom.rating} Đánh giá · Hà Nội, Việt Nam</p>
        </div>
        <button className="btn-primary" onClick={goToCheckout}>Đặt phòng ngay</button>
      </div>
      <div className="gallery-grid">
        <img src={selectedRoom.images[0]} className="gallery-main" alt="Main" />
        <div className="gallery-sub-grid">
          <img src={selectedRoom.images[1]} className="gallery-sub" alt="Sub 1" />
          <img src={selectedRoom.images[2]} className="gallery-sub" alt="Sub 2" />
        </div>
      </div>
      <div className="detail-content">
        <div className="detail-main">
          <h3>Về chỗ nghỉ này</h3>
          <p style={{marginTop: '10px'}}>{selectedRoom.longDesc}</p>
          <h3 style={{marginTop: '30px'}}>Tiện nghi cung cấp</h3>
          <div className="amenities-list">
            {selectedRoom.amenities.map((item, idx) => <div key={idx}>{item}</div>)}
          </div>
        </div>
        <div className="detail-sidebar">
          <div style={{fontSize: '24px', fontWeight: 'bold', color: '#d9534f', marginBottom: '10px'}}>
            {selectedRoom.price.toLocaleString('vi-VN')} đ <span style={{fontSize: '16px', color: '#666', fontWeight: 'normal'}}>/ đêm</span>
          </div>
          <p style={{marginBottom: '20px', color: '#555'}}>👥 Sức chứa: {selectedRoom.capacity}</p>
        </div>
      </div>
    </div>
  );
}