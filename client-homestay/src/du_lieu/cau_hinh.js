export const ROOMS = [
  {
    id: 'room_01',
    name: 'Studio 1',
    shortDesc: 'Căn hộ Studio hiện đại nằm trong khu phố cổ Hà Nội.',
    longDesc: 'Trải nghiệm nhịp sống Hà Nội ngay tại trung tâm phố cổ. Căn hộ Studio được thiết kế với không gian mở, đón ánh sáng tự nhiên. Hệ thống ra vào hoàn toàn tự động bằng công nghệ Smart Check-in bảo mật cao, đảm bảo không gian riêng tư tuyệt đối.',
    capacity: '2 Người lớn · 1 Giường đôi lớn',
    amenities: ['📶 Wi-Fi Tốc độ cao', '❄️ Điều hòa 2 chiều', '🍳 Bếp mini', '📺 Smart TV', '🚿 Nước nóng', '🔐 Khóa mã PIN'],
    price: 850000,
    rating: '4.8',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    ]
  },
  {
    id: 'room_02',
    name: 'Studio 2',
    shortDesc: 'Căn hộ view toàn cảnh Hồ Tây, ban công rộng rãi.',
    longDesc: 'Tận hưởng hoàng hôn tuyệt đẹp ngay từ ban công phòng bạn. Nằm tại khu vực Tây Hồ yên tĩnh, cách xa khói bụi thành phố nhưng vẫn đầy đủ tiện ích xung quanh. Phù hợp cho các cặp đôi tìm kiếm sự lãng mạn.',
    capacity: '2 Người lớn · 1 Giường King',
    amenities: ['📶 Wi-Fi', '❄️ Điều hòa', '🌅 Ban công View Hồ', '🛁 Bồn tắm', '☕ Máy pha cafe', '🔐 Khóa thông minh'],
    price: 1200000,
    rating: '4.9',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1648995505975-8fe3ebc7b253?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    ]
  },
  {
    id: 'room_03',
    name: 'Studio 3',
    shortDesc: 'Không gian rộng rãi 2 phòng ngủ, an ninh cao cấp.',
    longDesc: 'Căn hộ tiêu chuẩn gia đình nằm tại khu vực trung tâm hành chính Ba Đình, đảm bảo an ninh tuyệt đối. Bếp được trang bị đầy đủ dụng cụ nấu nướng. Khuôn viên tòa nhà có sân chơi trẻ em.',
    capacity: '4 Người lớn · 2 Trẻ em · 2 Giường đôi',
    amenities: ['📶 Wi-Fi', '❄️ Điều hòa', '🍳 Bếp gia đình', '🧺 Máy giặt', '🚗 Bãi đỗ xe', '🔐 Khóa nhận diện'],
    price: 1850000,
    rating: '4.7',
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09be15b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    ]
  }
];

export const INITIAL_FORM_STATE = {
  name: '', email: '', confirmEmail: '', phone: '', confirmPhone: '', checkIn: '', checkOut: '', totalPrice: 0
};

export const calculatePrice = (start, end, roomPricePerNight) => {
  if (!start || !end) return 0;
  const diffInMs = new Date(end) - new Date(start);
  const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60)); 
  if (diffInHours <= 0) return 0;

  const EXTRA_HOURLY_RATE = 100000; 

  if (diffInHours < 24) {
    if (diffInHours <= 6) {
      return diffInHours * EXTRA_HOURLY_RATE; 
    } else {
      return roomPricePerNight; 
    }
  }

  const fullDays = Math.floor(diffInHours / 24);
  const extraHours = diffInHours % 24;
  let total = fullDays * roomPricePerNight;

  if (extraHours > 0) {
    if (extraHours <= 6) {
      total += extraHours * EXTRA_HOURLY_RATE;
    } else {
      total += roomPricePerNight;
    }
  }
  return total;
};