import { Repository } from 'typeorm';
import { User } from './user.entity';
export declare class UsersService {
    private usersRepository;
    constructor(usersRepository: Repository<User>);
    findAll(): Promise<User[]>;
    findByUsername(nome_usuario: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    create(userData: Partial<User>): Promise<User>;
    updateLastLogin(userId: number): Promise<void>;
    updateUser(id: number, updateData: Partial<User>): Promise<User>;
    deactivateUser(id: number): Promise<void>;
}
