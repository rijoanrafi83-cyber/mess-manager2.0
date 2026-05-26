/**
 * Orphan Cleanup Service
 *
 * Detects and removes documents in meals, guestMeals, deposits,
 * mealSettings, and autoMealSkips whose `memberId` no longer
 * corresponds to any document in the `members` collection.
 *
 * Usage:
 *   1. Call scanOrphanedDocuments(ownerId) to get a dry-run report
 *   2. Review the report (counts + sample data)
 *   3. Call deleteOrphanedDocuments(ownerId, report) to execute cleanup
 *
 * Safety:
 *   - Admin-only (caller must verify role before invoking)
 *   - Two-step process prevents accidental deletion
 *   - Batched writes respect Firestore's 490-op limit
 *   - Report includes a timestamp token to prevent stale execution
 */

import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "../firebase";

const col = (name) => collection(db, name);

const RELATED_COLLECTIONS = [
  "meals",
  "guestMeals",
  "deposits",
  "mealSettings",
  "autoMealSkips",
];

const BATCH_LIMIT = 490;

export async function scanOrphanedDocuments(ownerId) {
  if (!ownerId) {
    throw new Error("ownerId is required for orphan scan.");
  }

  const membersSnap = await getDocs(
    query(col("members"), where("ownerId", "==", ownerId))
  );

  const validMemberIds = new Set(
    membersSnap.docs.map((doc) => doc.id)
  );

  const results = {};
  let totalOrphans = 0;

  for (const collectionName of RELATED_COLLECTIONS) {
    const snap = await getDocs(
      query(col(collectionName), where("ownerId", "==", ownerId))
    );

    const orphans = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const memberId = data.memberId;

      // A document is orphaned if it has a memberId that doesn't
      // exist in the current members collection
      if (memberId && !validMemberIds.has(memberId)) {
        orphans.push({
          id: docSnap.id,
          ref: docSnap.ref,
          memberId,
          date: data.date || null,
          title: data.title || data.guestName || null,
        });
      }
    }

    results[collectionName] = {
      total: snap.docs.length,
      orphaned: orphans.length,
      samples: orphans.slice(0, 3).map((o) => ({
        id: o.id,
        memberId: o.memberId,
        date: o.date,
        title: o.title,
      })),
      refs: orphans.map((o) => o.ref),
    };

    totalOrphans += orphans.length;
  }

  return {
    ownerId,
    scannedAt: Date.now(),
    token: `cleanup_${ownerId}_${Date.now()}`,
    validMemberCount: validMemberIds.size,
    totalOrphans,
    collections: results,
  };
}

export async function deleteOrphanedDocuments(ownerId, report) {
  if (!ownerId) {
    throw new Error("ownerId is required for orphan cleanup.");
  }

  if (!report || !report.token) {
    throw new Error("A valid scan report is required. Run a dry-run scan first.");
  }

  // Verify the report belongs to this workspace
  if (report.ownerId !== ownerId) {
    throw new Error("Report ownerId does not match the current workspace.");
  }

  // Prevent stale reports (older than 10 minutes)
  const ageMs = Date.now() - report.scannedAt;
  if (ageMs > 10 * 60 * 1000) {
    throw new Error(
      "Scan report is older than 10 minutes. Please re-scan before deleting."
    );
  }

  if (report.totalOrphans === 0) {
    return { deleted: 0, message: "No orphans to delete." };
  }

  const allRefs = [];
  for (const collectionName of RELATED_COLLECTIONS) {
    const collectionData = report.collections[collectionName];
    if (collectionData?.refs?.length) {
      allRefs.push(...collectionData.refs);
    }
  }

  let deleted = 0;
  for (let i = 0; i < allRefs.length; i += BATCH_LIMIT) {
    const chunk = allRefs.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }

  return {
    deleted,
    message: `Successfully deleted ${deleted} orphaned document${deleted === 1 ? "" : "s"}.`,
  };
}
