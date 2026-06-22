export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-col">
          <h4>Smart Homestay</h4>
          <p style={{color: '#aaa', lineHeight: '1.6'}}>Tiên phong trong giải pháp lưu trú thông minh tích hợp công nghệ IoT tại Việt Nam.</p>
        </div>
        <div className="footer-col">
          <h4>Về chúng tôi</h4>
          <ul>
            <li><a>Câu chuyện thương hiệu</a></li>
            <li><a>Tuyển dụng</a></li>
            <li><a>Blog du lịch</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Hỗ trợ khách hàng</h4>
          <ul>
            <li><a>Hướng dẫn Check-in tự động</a></li>
            <li><a>Chính sách hủy phòng</a></li>
            <li><a>Trung tâm trợ giúp (24/7)</a></li>
          </ul>
        </div>
        <div className="footer-col">
          <h4>Liên hệ</h4>
          <ul>
            <li>📍 Hà Nội</li>
            <li>📞 Hotline: 0386936966</li>
            <li>✉️ Email: hungg8371@gmail.com</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Smart Homestay. Đồ án 3.</p>
      </div>
    </footer>
  );
}