import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { RolesService } from 'src/roles/roles.service';
import { LoginDto, RegisterDto } from './dto/request/auth-request.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly roleService: RolesService,
        private readonly jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto, roles?: string) {
        if (!registerDto.email || !registerDto.password) {
            throw new Error('Email and password are required');
        }

        const existingUser = await this.usersService.findByEmail(registerDto.email);

        if (existingUser) {
            throw new Error('User already exists');
        }
        if (!roles) {
            roles = 'student'; // Default role is 'student'
        }
        // Tìm role 
        const role = await this.roleService.findByName(roles);

        if (!role) {
            throw new Error('Role not found');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);

        const newUser = await this.usersService.create({
            name: registerDto.name,
            email: registerDto.email,
            password: hashedPassword,
            role: role,
        });

        // Trả về user info (không trả password)
        const { password, ...userWithoutPassword } = newUser;
        return {
            message: 'User registered successfully',
            user: userWithoutPassword
        };
    }

    async login(loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user) {
            throw new Error('User not found');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role?.name
        };

        const { password, ...userWithoutPassword } = user;

        return {
            access_token: this.jwtService.sign(payload),
            user: userWithoutPassword
        };
    }

    async validateUser(userId: number) {
        return this.usersService.findOne(userId);
    }
}