import { setGlobalOptions } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { geohashQueryBounds, distanceBetween } from "geofire-common";

admin.initializeApp();

// Optimize performance and cold starts
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

/**
 * Triggered when a new document is created in the "requests" collection.
 * Finds matching eligible donors within 10KM and sends push notifications.
 */
export const onNewBloodRequest = onDocumentCreated(
  "requests/{requestId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with the event");
      return;
    }

    const requestData = snapshot.data();
    const requestId = event.params.requestId;
    const bloodGroup = requestData.bloodGroup;
    const location = requestData.location;

    if (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") {
      logger.error(`Invalid location data for request: ${requestId}`);
      return;
    }

    const center: [number, number] = [location.latitude, location.longitude];
    const radiusInM = 10 * 1000; // 10KM radius

    logger.info(`Processing request ${requestId}: ${bloodGroup} at ${center}`);

    try {
      // 1. Calculate geohash bounds for 10KM proximity
      const bounds = geohashQueryBounds(center, radiusInM);
      const promises = [];

      for (const b of bounds) {
        // Query ONLY by geohash to avoid complex composite index failures in Firebase.
        // All other filtering is done in-memory.
        const q = admin.firestore().collection("users")
          .orderBy("location.geohash")
          .startAt(b[0])
          .endAt(b[1]);

        promises.push(q.get());
      }

      // 2. Fetch all potential donors in geohash ranges
      const snapshots = await Promise.all(promises);
      const tokens: string[] = [];
      const userIdsForTokens: string[] = [];
      const processedUids = new Set<string>();

      for (const snap of snapshots) {
        for (const doc of snap.docs) {
          const donorData = doc.data();
          const donorId = doc.id;

          // Prevent duplicate processing if a donor falls in multiple bounds
          if (processedUids.has(donorId)) continue;
          processedUids.add(donorId);

          // IN-MEMORY FILTERS (Prevents Firestore 'Index Required' errors)
          if (!donorData.roles || !donorData.roles.includes("donor")) continue;
          if (donorData.isAvailable !== true) continue;
          if (donorData.isEligibleToDonate !== true) continue;
          if (donorData.bloodGroup !== bloodGroup) continue;

          // Skip if it's the requester themselves 
          // (COMMENTED OUT FOR TESTING: uncomment in production so users don't ping themselves)
          // if (donorId === requestData.requesterId) continue;

          // Verify exact distance (geohash bounds are a square, we want a circle)
          const donorLocation = donorData.location;
          if (donorLocation && donorLocation.latitude && donorLocation.longitude) {
            const distanceInKm = distanceBetween(
              [donorLocation.latitude, donorLocation.longitude],
              center
            );

            if (distanceInKm <= 10 && donorData.fcmToken) {
              tokens.push(donorData.fcmToken);
              userIdsForTokens.push(donorId);
            }
          }
        }
      }

      if (tokens.length === 0) {
        logger.info("No eligible matching donors found within 10KM.");
        return;
      }

      logger.info(`Found ${tokens.length} eligible donors. Sending notifications...`);

      // 3. Construct and send the multicast notification
      const message: admin.messaging.MulticastMessage = {
        tokens: tokens,
        notification: {
          title: "🩸 Urgent Blood Request Nearby!",
          body: `An ${bloodGroup} donor is needed urgently at ${requestData.hospitalName}. Can you help?`,
        },
        data: {
          requestId: requestId,
          bloodGroup: bloodGroup,
          type: "BLOOD_REQUEST_MATCH",
          click_action: "FLUTTER_NOTIFICATION_CLICK", // Generic trigger for RN/Flutter
        },
        android: {
          priority: "high",
          notification: {
            channelId: "urgent_alerts",
            icon: "notification_icon",
            color: "#B62022",
            sound: "default",
          },
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: "default",
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      logger.info(`Notification Summary: ${response.successCount} success, ${response.failureCount} failure.`);

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
);
