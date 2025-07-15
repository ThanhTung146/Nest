import { ApiProperty } from "@nestjs/swagger";
import { DeviceToken } from "src/device-token/entities/device-token.entity";
import { Role } from "src/roles/entity/roles.entity";

export class CreateUserRequest {

  @ApiProperty({ description: 'Name' })
  name: string;

  @ApiProperty({ description: 'Email' })
  email: string;

  @ApiProperty({ description: 'Password' })
  password: string;

  @ApiProperty({ description: 'Role' })
  role: Role;

  deviceToken: string;
}

export class UpdateUserRequest {
  @ApiProperty({ description: 'Email' })
  email: string;

  @ApiProperty({ description: 'Password' })
  password: string;

  @ApiProperty({ description: 'Role' })
  role: Role;
}
