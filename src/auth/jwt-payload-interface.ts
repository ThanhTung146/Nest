// src/auth/interfaces/jwt-payload.interface.ts

export interface JwtPayload {
    userId: number;        // ID của người dùng (có thể là ID từ database)
    username: string;      // Tên người dùng (hoặc email, nếu bạn dùng email để đăng nhập)
    roles: string[];       // Danh sách vai trò của người dùng (admin, user, teacher, v.v.)
}
