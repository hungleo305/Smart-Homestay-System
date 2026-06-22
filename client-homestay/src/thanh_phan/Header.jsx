export default function Header({ goHome }) {
  return (
    <header className="header">
      <h1 onClick={goHome} style={{cursor: 'pointer'}}>SmartBooking</h1>
      <div className="header-nav">
        <a onClick={goHome}>Trang chủ</a>
        <a onClick={goHome}>Khuyến mãi</a>
        <a onClick={goHome}>Trải nghiệm</a>
        <a onClick={goHome}>Hỗ trợ</a>
      </div>
    </header>
  );
}