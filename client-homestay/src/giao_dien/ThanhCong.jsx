export default function ThanhCong({ formData, pin, goHome }) {
  return (
    <div className="success-screen">
      <div className="success-icon">✔️</div>
      <h2>Thanh Toán Thành Công!</h2>
      <p style={{marginTop: '10px'}}>Cảm ơn <strong>{formData.name}</strong> đã đặt phòng tại Smart Homestay.</p>
      <div className="email-notice">📧 Một email thật kèm mã bảo mật đã được gửi tới: {formData.email}</div>
      <div style={{border: '2px dashed #d4af37', padding: '20px', margin: '30px 0', borderRadius: '10px'}}>
        <p>Mã PIN mở cửa của bạn là:</p>
        <h1 style={{fontSize: '50px', color: '#d9534f', letterSpacing: '10px', margin: '10px 0'}}>{pin}</h1>
        <p style={{color: '#666', fontSize: '14px'}}>* Mã này sẽ tự động vô hiệu hóa sau thời gian Check-out.</p>
      </div>
      <button className="btn-outline" onClick={goHome}>Quay về Trang chủ</button>
    </div>
  );
}