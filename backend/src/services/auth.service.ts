import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { SessionManager } from '../config/redis';
import { User } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

interface RegisterInput {
  email: string;
  password: string;
  role: 'passenger' | 'driver' | 'admin';
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  // Validate email format
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  private static isValidPassword(password: string): boolean {
    // At least 8 characters, one uppercase, one lowercase, one number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  }

  // Hash password
  private static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Compare password with hash
  private static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT access token
  private static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  // Generate JWT refresh token
  private static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  // Verify JWT token
  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;
  }

  // Register new user
  static async register(input: RegisterInput): Promise<AuthResponse> {
    const { email, password, role } = input;

    // Validate email
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (!this.isValidPassword(password)) {
      throw new Error(
        'Password must be at least 8 characters and contain uppercase, lowercase, and number'
      );
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, passwordHash, role]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    // Store refresh token in Redis
    try {
      await SessionManager.storeRefreshToken(user.id, refreshToken);
    } catch (error) {
      console.warn('Failed to store refresh token in Redis:', error);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken,
    };
  }

  // Login user
  static async login(input: LoginInput): Promise<AuthResponse> {
    const { email, password } = input;

    console.log('[AUTH] Login attempt for:', email);

    // Try to find user in users table
    let result = await pool.query(
      'SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1',
      [email]
    );

    console.log('[AUTH] Users table result:', result.rows.length);

    // If not found in users, try owners table
    if (result.rows.length === 0) {
      console.log('[AUTH] Checking owners table...');
      result = await pool.query(
        'SELECT id, email, password as password_hash, role, created_at FROM owners WHERE email = $1',
        [email]
      );
      console.log('[AUTH] Owners table result:', result.rows.length);
    }

    if (result.rows.length === 0) {
      console.log('[AUTH] No user/owner found');
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];
    console.log('[AUTH] Found user/owner:', user.email, 'role:', user.role);

    // Verify password
    const isPasswordValid = await this.comparePassword(password, user.password_hash);
    console.log('[AUTH] Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    // Store refresh token in Redis
    try {
      await SessionManager.storeRefreshToken(user.id, refreshToken);
    } catch (error) {
      console.warn('Failed to store refresh token in Redis:', error);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken,
    };
  }

  // Refresh access token with token rotation
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.verifyRefreshToken(refreshToken);

      // Verify the refresh token matches the one stored in Redis
      const storedToken = await SessionManager.getRefreshToken(payload.userId);
      
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Verify user still exists
      const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [
        payload.userId,
      ]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Generate new tokens (token rotation)
      const newTokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.generateAccessToken(newTokenPayload);
      const newRefreshToken = this.generateRefreshToken(newTokenPayload);

      // Store new refresh token and invalidate old one
      await SessionManager.storeRefreshToken(user.id, newRefreshToken);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  // Logout user (blacklist token)
  static async logout(accessToken: string, userId: string): Promise<void> {
    try {
      // Decode token to get expiration time
      const decoded = jwt.decode(accessToken) as { exp: number };
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

      // Add token to blacklist
      if (expiresIn > 0) {
        await SessionManager.blacklistToken(accessToken, expiresIn);
      }

      // Delete refresh token
      await SessionManager.deleteRefreshToken(userId);
    } catch (error) {
      console.warn('Failed to blacklist token:', error);
    }
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      return await SessionManager.isTokenBlacklisted(token);
    } catch (error) {
      console.warn('Failed to check token blacklist:', error);
      return false;
    }
  }

  // Get user by ID (checks both users and owners tables)
  static async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    // Try users table first
    let result = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    // If not found, try owners table
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT id, email, role, created_at FROM owners WHERE id = $1',
        [userId]
      );
    }

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    };
  }
}
