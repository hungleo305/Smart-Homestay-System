export default function ThanhToan({ formData, setCurrentView, handleConfirmPayment, isProcessing }) {
  const BANK_ID = "MB"; 
  const ACCOUNT_NO = "0386936966"; 
  const ACCOUNT_NAME = "CHU MANH HUNG"; 
  const transferContent = ` ${formData.phone}`;
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${formData.totalPrice}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;

  return (
    <div className="checkout-container" style={{textAlign: 'center'}}>
      <h2 style={{color: '#1a1a1a'}}>Thanh Toán Quét Mã QR</h2>
      <p style={{color: '#666', marginBottom: '20px'}}>Vui lòng mở ứng dụng ngân hàng và quét mã để thanh toán.</p>
      
      <div style={{display: 'inline-block', padding: '20px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: '#fff', marginBottom: '30px'}}>
        <img src={qrUrl} alt="VietQR" style={{width: '300px', height: '300px'}} />
        <div style={{textAlign: 'left', marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '15px'}}>
          <p>Ngân hàng: <strong>MB Bank</strong></p>
          <p>Số tài khoản: <strong>{ACCOUNT_NO}</strong></p>
          <p>Chủ tài khoản: <strong>{ACCOUNT_NAME}</strong></p>
          <p>Số tiền: <strong style={{color: '#d9534f'}}>{formData.totalPrice.toLocaleString('vi-VN')} VND</strong></p>
          <p>Nội dung CK: <strong>{transferContent}</strong></p>
        </div>
      </div>

      <div style={{backgroundColor: '#e9f0fa', padding: '15px', borderRadius: '5px', marginBottom: '20px', color: '#005999'}}>
        ℹ️ <i>Hệ thống sẽ gửi mã PIN tự động vào email của bạn ngay sau khi xác nhận thanh toán thành công.</i>
      </div>

      <div style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
        <button type="button" className="btn-outline" onClick={() => setCurrentView('checkout')} disabled={isProcessing}>
          Quay lại
        </button>
        <button type="button" className="btn-primary" onClick={handleConfirmPayment} disabled={isProcessing}>
          {isProcessing ? 'Đang gửi Email & Cấp mã...' : 'Tôi đã thanh toán thành công'}
        </button>
      </div>
    </div>
  );
}