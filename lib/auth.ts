import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import User from '@/models/SystemUser';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JWTPayload {
  userId: string;
  role: 'superadmin' | 'admin';
  storeId?: string;
  email?: string;
  id?: string;
  permissions?: string[];
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Verify user still exists and is active
  const user = await User.findById(payload.userId);
  if (!user || !user.isActive) return null;

  // Add role-based permissions to payload if not present
  if (!payload.permissions) {
    payload.permissions = [...(ROLE_PERMISSIONS[user.role] || [])];
  }

  return payload;
}

export async function requireAuth(role?: 'superadmin' | 'admin', requiredPermissions?: string[]): Promise<JWTPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  if (role && user.role !== role) {
    throw new Error('Insufficient permissions');
  }

  // Check specific permissions if required
  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new Error('Insufficient permissions');
    }
  }

  return user;
}

export async function requireSuperAdmin(requiredPermissions?: string[]): Promise<JWTPayload> {
  return requireAuth('superadmin', requiredPermissions);
}

export async function requireAdmin(requiredPermissions?: string[]): Promise<JWTPayload> {
  return requireAuth('admin', requiredPermissions);
}

// Permission constants
export const PERMISSIONS = {
  // Store management
  CREATE_STORE: 'create_store',
  UPDATE_STORE: 'update_store',
  DELETE_STORE: 'delete_store',
  VIEW_ALL_STORES: 'view_all_stores',

  // Admin management
  CREATE_ADMIN: 'create_admin',
  UPDATE_ADMIN: 'update_admin',
  DELETE_ADMIN: 'delete_admin',
  VIEW_ALL_ADMINS: 'view_all_admins',

  // Analytics
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_REPORTS: 'view_reports',

  // Customer management
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',

  // Visit management
  VIEW_VISITS: 'view_visits',
  MANAGE_VISITS: 'manage_visits',

  // Reward management
  MANAGE_REWARDS: 'manage_rewards',
  VIEW_REWARDS: 'view_rewards',
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: [
    PERMISSIONS.CREATE_STORE,
    PERMISSIONS.UPDATE_STORE,
    PERMISSIONS.DELETE_STORE,
    PERMISSIONS.VIEW_ALL_STORES,
    PERMISSIONS.CREATE_ADMIN,
    PERMISSIONS.UPDATE_ADMIN,
    PERMISSIONS.DELETE_ADMIN,
    PERMISSIONS.VIEW_ALL_ADMINS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_VISITS,
    PERMISSIONS.MANAGE_VISITS,
    PERMISSIONS.MANAGE_REWARDS,
    PERMISSIONS.VIEW_REWARDS,
  ],
  admin: [
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_VISITS,
    PERMISSIONS.MANAGE_VISITS,
    PERMISSIONS.MANAGE_REWARDS,
    PERMISSIONS.VIEW_REWARDS,
  ],
};

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
