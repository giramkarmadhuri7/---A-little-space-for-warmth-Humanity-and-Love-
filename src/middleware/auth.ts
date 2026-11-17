import { Request, Response, NextFunction } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { eq } from 'drizzle-orm';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { adminUsers } from '../db/schema.ts';
import { verifyAdminSession } from '../server/security.ts';

export interface AdminRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  adminUser?: AdminRecord;
}

export const requireFirebaseAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase ID token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const sessionToken = req.headers['x-admin-session'];
  if (typeof sessionToken !== 'string' || !sessionToken) {
    return res.status(403).json({ error: 'Admin passphrase verification required' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    req.user = decoded;

    const sessionPayload = verifyAdminSession(sessionToken);
    if (!sessionPayload || sessionPayload.uid !== decoded.uid) {
      return res.status(403).json({ error: 'Invalid or expired admin session' });
    }

    const rows = await db
      .select({
        id: adminUsers.id,
        uid: adminUsers.uid,
        email: adminUsers.email,
        displayName: adminUsers.displayName,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
      })
      .from(adminUsers)
      .where(eq(adminUsers.uid, decoded.uid))
      .limit(1);

    const admin = rows[0];
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'Forbidden: Authorized admin access only' });
    }

    req.adminUser = admin;
    next();
  } catch (error) {
    console.error('Admin verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized admin request' });
  }
};
