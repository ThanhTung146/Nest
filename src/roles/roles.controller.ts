import { 
    Controller, 
    Get, 
    UseGuards, 
    Param, 
    ParseIntPipe, 
    Body, 
    Post, 
    Put, 
    Delete 
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from './entity/roles.entity';
import { RolesService } from './roles.service';
import { 
    ApiTags, 
    ApiOperation, 
    ApiParam, 
    ApiResponse, 
    ApiBearerAuth,
    ApiProperty 
} from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

// DTO for creating/updating roles
class CreateRoleDto {
    @ApiProperty({
        description: 'Role name',
        example: 'admin'
    })
    @IsString()
    @IsNotEmpty()
    name: string;
}

class UpdateRoleDto {
    @ApiProperty({
        description: 'Role name',
        example: 'moderator',
        required: false
    })
    @IsString()
    name?: string;
}

@ApiTags('Roles')
@Controller('roles')
@ApiBearerAuth('JWT-auth')
// @UseGuards(JwtAuthGuard) // Uncomment if you want to protect all endpoints
export class RolesController {
    constructor(
        private readonly rolesService: RolesService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Fetch all roles' })
    @ApiResponse({ 
        status: 200, 
        description: 'The list of roles has been successfully fetched.',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'number' },
                    name: { type: 'string' }
                }
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Forbidden. User is not authorized to access the roles.' })
    getAllRoles(): Promise<Role[]> {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Fetch a role by its ID' })
    @ApiParam({ name: 'id', description: 'ID of the role', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'The role has been successfully fetched.',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number' },
                name: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Role not found.' })
    @ApiResponse({ status: 403, description: 'Forbidden. User is not authorized to access this role.' })
    async getRoleById(@Param('id', ParseIntPipe) id: number): Promise<Role | null> {
        const role = await this.rolesService.findOne(id);
        if (!role) {
            throw new Error('Role not found');
        }
        return role;
    }

    @Post()
    @ApiOperation({ summary: 'Create a new role' })
    @ApiResponse({ 
        status: 201, 
        description: 'The role has been successfully created.',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number' },
                name: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 400, description: 'Invalid data provided.' })
    @ApiResponse({ status: 403, description: 'Forbidden. User is not authorized to create roles.' })
    async createRole(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
        // Check if role already exists
        const existingRole = await this.rolesService.findByName(createRoleDto.name);
        if (existingRole) {
            throw new Error('Role already exists');
        }
        return this.rolesService.create(createRoleDto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an existing role by ID' })
    @ApiParam({ name: 'id', description: 'ID of the role to update', type: Number })
    @ApiResponse({ 
        status: 200, 
        description: 'The role has been successfully updated.',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'number' },
                name: { type: 'string' }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Role not found.' })
    @ApiResponse({ status: 400, description: 'Invalid data provided.' })
    @ApiResponse({ status: 403, description: 'Forbidden. User is not authorized to update this role.' })
    async updateRole(
        @Param('id', ParseIntPipe) id: number, 
        @Body() updateRoleDto: UpdateRoleDto
    ): Promise<Role | null> {
        const existingRole = await this.rolesService.findOne(id);
        if (!existingRole) {
            throw new Error('Role not found');
        }

        // Check if new name already exists (if name is being updated)
        if (updateRoleDto.name && updateRoleDto.name !== existingRole.name) {
            const roleWithSameName = await this.rolesService.findByName(updateRoleDto.name);
            if (roleWithSameName) {
                throw new Error('Role with this name already exists');
            }
        }

        return this.rolesService.update(id, updateRoleDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a role by ID' })
    @ApiParam({ name: 'id', description: 'ID of the role to delete', type: Number })
    @ApiResponse({ status: 200, description: 'The role has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Role not found.' })
    @ApiResponse({ status: 403, description: 'Forbidden. User is not authorized to delete this role.' })
    async deleteRole(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
        const existingRole = await this.rolesService.findOne(id);
        if (!existingRole) {
            throw new Error('Role not found');
        }

        // Prevent deletion of default roles
        if (['teacher', 'student'].includes(existingRole.name)) {
            throw new Error('Cannot delete default roles');
        }

        await this.rolesService.delete(id);
        return { message: 'Role deleted successfully' };
    }
}
