import { setGlobalOptions } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { geohashQueryBounds, distanceBetween } from "geofire-common";
import express from "express";
import cors from "cors";
import { isUserAvailableNow } from "./availability";


admin.initializeApp();

// Optimize performance and cold starts
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

/**
 * Blood group compatibility map: Recipient Group -> List of compatible Donor Groups
 */
const COMPATIBILITY_MAP: Record<string, string[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"],
};

async function processBloodRequest(event: any) {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with the event");
      return;
    }

    const requestData = snapshot.data();
    const requestId = event.params.requestId;
    const requestedGroup = requestData.bloodGroup;
    const hospitalName = requestData.hospitalName;
    const location = requestData.location;

    if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      logger.error(`Invalid location data for request: ${requestId}`);
      return;
    }

    const compatibleGroups = COMPATIBILITY_MAP[requestedGroup] || [requestedGroup];
    const center: [number, number] = [location.latitude, location.longitude];
    const radiusInM = 10 * 1000; // 10KM radius

    logger.info(`Processing request ${requestId}: ${requestedGroup} at ${hospitalName}. Compatible groups: ${compatibleGroups}`);

    try {
      // 1. Calculate geohash bounds for 10KM proximity
      const bounds = geohashQueryBounds(center, radiusInM);
      const promises = [];

      for (const b of bounds) {
        const q = admin.firestore().collection("users")
          .orderBy("location.geohash")
          .startAt(b[0])
          .endAt(b[1]);
        promises.push(q.get());
      }

      // 2. Fetch potential donors and filter by compatibility and distance
      const snapshots = await Promise.all(promises);
      const tokens: string[] = [];
      const userIdsForTokens: string[] = [];
      const processedUids = new Set<string>();

      logger.info(`Fetched ${snapshots.reduce((acc, s) => acc + s.size, 0)} potential donor documents across all bounds.`);

      // Special handling for Test Mode: Explicitly add the requester to the notification list
      const isTestRequest = requestData.isTest === true;
      if (isTestRequest && requestData.requesterId) {
        logger.info(`Test Mode active: Fetching requester document ${requestData.requesterId} directly.`);
        const requesterDoc = await admin.firestore().collection("users").doc(requestData.requesterId).get();
        if (requesterDoc.exists) {
          const reqData = requesterDoc.data();
          if (reqData?.fcmToken) {
            logger.info(`Test Mode: Adding requester's own token for verification.`);
            tokens.push(reqData.fcmToken);
            userIdsForTokens.push(requestData.requesterId);
            processedUids.add(requestData.requesterId);
          } else {
            logger.warn(`Test Mode: Requester ${requestData.requesterId} has no fcmToken!`);
          }
        }
      }

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const donorData = doc.data();
          const donorId = doc.id;

          if (processedUids.has(donorId)) continue;
          processedUids.add(donorId);

          // IN-MEMORY FILTERS
          if (!donorData.roles || !donorData.roles.includes("donor")) {
            logger.info(`Skipping ${donorId}: user is not a donor.`);
            continue;
          }

          if (donorData.isAvailable !== true || donorData.isEligibleToDonate !== true) {
            logger.info(`Skipping ${donorId}: user is unavailable or ineligible.`);
            continue;
          }

          // Schedule Availability Check
          if (donorData.schedule) {
            const isAvailable = isUserAvailableNow(donorData.schedule, new Date());
            if (!isAvailable) {
              logger.info(`Skipping ${donorId}: user is currently outside scheduled availability hours.`);
              continue;
            }
          }


          // Compatibility Check
          if (!compatibleGroups.includes(donorData.bloodGroup)) {
            logger.info(`Skipping ${donorId}: incompatible blood group (${donorData.bloodGroup} vs ${requestedGroup}).`);
            continue;
          }

          // FCM Token check
          if (!donorData.fcmToken) {
            logger.info(`Skipping ${donorId}: no FCM token found in Firestore.`);
            continue;
          }

          // Verify distance (Bypass for test requests to ensure test delivery)
          const donorLocation = donorData.location;

          if (isTestRequest) {
            logger.info(`Test Mode: adding token for user ${donorId} regardless of distance.`);
            tokens.push(donorData.fcmToken);
            userIdsForTokens.push(donorId);
            continue;
          }

          if (donorLocation && donorLocation.latitude && donorLocation.longitude) {
            const distanceInKm = distanceBetween(
              [donorLocation.latitude, donorLocation.longitude],
              center
            );

            if (distanceInKm <= 10) {
              tokens.push(donorData.fcmToken);
              userIdsForTokens.push(donorId);
            } else {
              logger.info(`Skipping ${donorId}: distance ${distanceInKm.toFixed(1)}km is > 10km.`);
            }
          } else {
            logger.info(`Skipping ${donorId}: no location data available.`);
          }
        }
      }

      if (tokens.length === 0) {
        logger.info("No compatible eligible donors found matching criteria.");
        return;
      }

      logger.info(`Final check: sending notifications to ${tokens.length} tokens.`);

      // 3. Construct and send the multicast notification
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens,
        notification: {
          title: "Urgent Blood Request 🩸",
          body: `${requestedGroup} needed at ${hospitalName}`,
        },
        data: {
          requestId: requestId,
          bloodGroup: requestedGroup,
          type: "BLOOD_REQUEST_MATCH",
          click_action: "FLUTTER_NOTIFICATION_CLICK", // Sometimes helps on older Android
        },
        android: {
          priority: "high",
          notification: {
            channelId: "default",
            priority: "high",
            sound: "default",
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: "Urgent Blood Request 🩸",
                body: `${requestedGroup} needed at ${hospitalName}`,
              },
              sound: "default",
              badge: 1,
              "content-available": 1,
            },
          },
          headers: {
            "apns-priority": "10",
          },
        },
      };

      logger.info(`[DEBUG] Final Multicast Message:`, JSON.stringify(message, null, 2));
      logger.info(`[DEBUG] Targeting Tokens:`, tokens);

      const response = await admin.messaging().sendEachForMulticast(message);

      logger.info(`[DEBUG] FCM Results: success=${response.successCount}, failure=${response.failureCount}`);

      if (response.failureCount > 0) {
        response.responses.forEach((res, idx) => {
          if (!res.success) {
            logger.error(`[DEBUG] Token ${tokens[idx]} failed:`, res.error);
          }
        });
      }

      // 4. Clean up invalid or stale tokens to maintain database health
      if (response.failureCount > 0) {
        const batch = admin.firestore().batch();
        let tokensToRemoveCount = 0;

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (
              errCode === "messaging/invalid-registration-token" ||
              errCode === "messaging/registration-token-not-registered"
            ) {
              const uid = userIdsForTokens[idx];
              const userRef = admin.firestore().collection("users").doc(uid);
              // Safely remove the stale token
              batch.update(userRef, { fcmToken: admin.firestore.FieldValue.delete() });
              tokensToRemoveCount++;
            } else {
              logger.warn(`Failed to send to token ${tokens[idx]}: ${errCode}`);
            }
          }
        });

        if (tokensToRemoveCount > 0) {
          logger.info(`Removing ${tokensToRemoveCount} invalid FCM tokens from Firestore...`);
          await batch.commit();
        }
      }

    } catch (error) {
      logger.error(`Error in onNewBloodRequest for ${requestId}:`, error);
    }
}

/**
 * Triggered when a new document is created in the "requests" collection.
 * Finds matching eligible donors within 10KM with compatible blood groups and sends push notifications.
 */
export const onNewBloodRequest = onDocumentCreated(
  "requests/{requestId}",
  async (event) => {
    return processBloodRequest(event);
  }
);

/**
 * Triggered when a new document is created in the new "bloodRequests" collection.
 */
export const onNewBloodRequestV2 = onDocumentCreated(
  "bloodRequests/{requestId}",
  async (event) => {
    return processBloodRequest(event);
  }
);

/**
 * Cleanup task: Automatically expire active requests older than 48 hours.
 * Runs every hour.
 */
export const expireOldRequests = onSchedule("every 1 hours", async (event) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const fortyEightHoursAgo = new Date(now.toDate().getTime() - 48 * 60 * 60 * 1000);

  const q = db.collection("bloodRequests")
    .where("status", "==", "active")
    .where("createdAt", "<=", fortyEightHoursAgo);

  const snapshot = await q.get();
  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "expired",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  logger.info(`Expired ${snapshot.size} stale active requests.`);
});

/**
 * Cleanup task: Revert matched requests that haven't been completed within 30 minutes.
 * Runs every 10 minutes.
 */
export const revertStaleMatches = onSchedule("every 10 minutes", async (event) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const thirtyMinutesAgo = new Date(now.toDate().getTime() - 30 * 60 * 1000);

  const q = db.collection("bloodRequests")
    .where("status", "==", "matched")
    .where("acceptedAt", "<=", thirtyMinutesAgo);

  const snapshot = await q.get();
  if (snapshot.empty) return;

  const batch = db.batch();
  for (const requestDoc of snapshot.docs) {
    const requestData = requestDoc.data();
    batch.update(requestDoc.ref, {
      status: "active",
      donorId: null,
      acceptedAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Also cancel the specific match record if it exists
    if (requestData.donorId) {
      const matchQuery = await db.collection("bloodMatches")
        .where("requestId", "==", requestDoc.id)
        .where("donorId", "==", requestData.donorId)
        .where("status", "==", "accepted")
        .limit(1)
        .get();

      matchQuery.forEach(m => {
        batch.update(m.ref, {
          status: "failed",
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
    }
  }

  await batch.commit();
  logger.info(`Reverted ${snapshot.size} stale matches and updated match records.`);
});

// Express App for Scheduled Donation Availability System
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Expose POST endpoint to save schedule
app.post("/save-schedule", async (req: any, res: any) => {
  const { uid, schedule } = req.body;
  if (!uid || !schedule) {
    return res.status(400).json({ error: "Missing uid or schedule" });
  }

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const selectedDays = Object.keys(schedule).filter(d => days.includes(d));

  if (selectedDays.length === 0) {
    return res.status(400).json({ error: "At least 1 day must be selected" });
  }

  for (const day of selectedDays) {
    const { start, end } = schedule[day];
    if (!start || !end) {
      return res.status(400).json({ error: "No empty schedules allowed" });
    }
    if (start >= end) {
      return res.status(400).json({ error: "Start time must be before end time" });
    }
  }

  try {
    await admin.firestore().collection("users").doc(uid).set({ schedule }, { merge: true });
    return res.status(200).json({ message: "Schedule saved successfully" });
  } catch (error) {
    logger.error("Error in /save-schedule:", error);
    return res.status(500).json({ error: "Failed to save schedule" });
  }
});

// Expose GET endpoint to check availability
app.get("/check-availability", async (req: any, res: any) => {
  const { uid } = req.query;
  if (!uid) {
    return res.status(400).json({ error: "Missing uid query parameter" });
  }

  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const available = isUserAvailableNow(userData?.schedule, new Date());
    return res.status(200).json({ uid, available });
  } catch (error) {
    logger.error("Error in /check-availability:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export const api = onRequest(app);

