import { Controller, Get, UseGuards, Request, Param, ParseIntPipe, Body, Post, Put, Delete } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { User } from './entity/user.entity';
import { CreateUserRequest, UpdateUserRequest } from './dto/request/user-request.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('users')
// @UseGuards(JwtAuthGuard) // Apply the JWT guard to all routes in this controller
export class UsersController {
    constructor(private readonly usersService: UsersService, // Assuming UsersService is imported from the correct path
    ) { }

    @Get('me')
    @ApiOperation({ summary: 'Get profile of the currently authenticated user' }) // Add description
    getProfile(@Request() req) {
        return req.user; // Assuming req.user contains the authenticated user's information
    }

    @Get()
    @ApiOperation({ summary: 'Get a list of all users' }) // Add description
    getALl(): Promise<User[]> {
        return this.usersService.findAll(); // Fetch all users
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a user by their ID' }) // Add description
    getUserById(@Param('id', ParseIntPipe) id: number): Promise<User | null> {
        return this.usersService.findOne(id); // Fetch the user by ID
    }

    @Post()
    @ApiOperation({ summary: 'Create a new user' }) // Add description
    createUser(@Body() userRequest: CreateUserRequest): Promise<User> {
        return this.usersService.create(userRequest); // Create a new user
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an existing user' }) // Add description
    updateUser(@Param('id', ParseIntPipe) id: number, @Body() user: UpdateUserRequest): Promise<User | null> {
        return this.usersService.update(id, user); // Update an existing user
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a user by their ID' }) // Add description
    deleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.usersService.delete(id);
    }


}
