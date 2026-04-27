import {setGlobalOptions} from "firebase-functions";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

/**
 * Triggered when a new document is created in the "requests" collection.
 * Finds matching available donors and sends them an FCM notification.
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

  logger.info(`Processing new blood request: ${requestId} for ${bloodGroup}`);

  try {
    // 1. Find matching donors
    const donorsSnapshot = await admin.firestore().collection("users")
      .where("roles", "array-contains", "donor")
      .where("isAvailable", "==", true)
      .where("bloodGroup", "==", bloodGroup)
      .get();

    if (donorsSnapshot.empty) {
      logger.info("No matching donors found.");
      return;
    }

    // 2. Extract FCM tokens
    const tokens: string[] = [];
    donorsSnapshot.forEach((doc) => {
      const data = doc.data();
      // Don't notify the requester themselves
      if (data.fcmToken && doc.id !== requestData.requesterId) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      logger.info("Matched donors found, but none have valid FCM tokens.");
      return;
    }

    // 3. Send notifications
    const message: admin.messaging.MulticastMessage = {
      tokens: tokens,
      notification: {
        title: "Urgent Blood Request",
        body: `${bloodGroup} needed at ${requestData.hospitalName} ` +
              `for ${requestData.patientName}`,
      },
      data: {
        requestId: requestId,
        type: "BLOOD_REQUEST_MATCH",
      },
      android: {
        priority: "high",
        notification: {
          channelId: "high_priority",
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    logger.info(`Sent ${response.successCount} notifications successfully.`);

    if (response.failureCount > 0) {
      logger.warn(`${response.failureCount} notifications failed to send.`);
    }
  } catch (error) {
    logger.error("Error processing blood request notification:", error);
  }
});
