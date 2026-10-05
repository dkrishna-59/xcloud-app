import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type ActivityType = 'UPLOAD' | 'DELETE' | 'RESTORE' | 'RENAME' | 'SHARE' | 'UPGRADE' | 'LOGIN' | 'REVOKE' | 'PURGE';

export interface Activity {
  id?: string;
  type: ActivityType;
  fileName?: string;
  details: string;
  timestamp: any;
  isRead: boolean;
}

/**
 * Logs a user activity event to Firestore.
 */
export const logActivity = async (userId: string, type: ActivityType, details: string, fileName?: string) => {
  try {
    const activityRef = collection(db, 'users', userId, 'activities');
    await addDoc(activityRef, {
      type,
      details,
      fileName: fileName || null,
      timestamp: serverTimestamp(),
      isRead: false
    });
  } catch (error) {
    console.error("[ACTIVITY] Failed to log activity:", error);
  }
};

/**
 * Marks all activities as read.
 */
export const markAllAsRead = async (userId: string, activities: Activity[]) => {
  try {
    for (const activity of activities) {
      if (!activity.isRead && activity.id) {
        const docRef = doc(db, 'users', userId, 'activities', activity.id);
        await updateDoc(docRef, { isRead: true });
      }
    }
  } catch (error) {
    console.error("[ACTIVITY] Failed to mark as read:", error);
  }
};
