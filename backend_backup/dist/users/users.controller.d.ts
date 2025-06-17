import { UsersService } from './users.service';
import { CreateUserDto } from '../common/dto/create-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<{
        message: string;
        data: import("./user.entity").User[];
        total: number;
    }>;
    findOne(id: number): Promise<{
        message: string;
        data: import("./user.entity").User;
    }>;
    create(createUserDto: CreateUserDto): Promise<{
        message: string;
        data: import("./user.entity").User;
    }>;
    update(id: number, updateData: Partial<CreateUserDto>): Promise<{
        message: string;
        data: import("./user.entity").User;
    }>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
