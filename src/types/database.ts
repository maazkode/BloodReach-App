import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type UserRole = 'donor' | 'requester';

export interface UserDocument {
    uid: string;
    roles: string[];
    lastActiveRole: UserRole;
    name: string;
    age?: number;
    weight?: number;
    gender?: string;
    bloodGroup: string;
    phone: string;
    city: string;
    address?: string;
    isAvailable: boolean;
    isEligibleToDonate: boolean;
    lastDonationDate: FirebaseFirestoreTypes.Timestamp | null;
    donationCooldownUntil: FirebaseFirestoreTypes.Timestamp | null;
    location: {
        latitude: number;
        longitude: number;
        geohash: string;
    };
    locationUpdatedAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
    // address: string;
    fcmToken?: string;
    email: string;
    photoURL: string;
    isVerified: boolean;
    profileCompleted?: boolean;
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
    updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}

export interface DonationRequest {
    id?: string;
    requesterId: string;
    bloodGroup: string;
    unitsRequired: number;
    hospitalName: string;
    hospitalAddress: string;
    city: string;
    location: {
        latitude: number;
        longitude: number;
        geohash: string;
    };
    patientName: string;
    phone: string;
    urgencyLevel: 'normal' | 'urgent' | 'critical';
    status: 'open' | 'matched' | 'completed' | 'cancelled';
    matchedDonorIds: string[];
    isTest?: boolean;
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
    updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}

export interface DonationMatch {
    id?: string;
    requestId: string;
    donorId: string;
    requesterId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    donorPhone?: string;
    requesterPhone?: string;
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
    updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}

export interface BloodRequest {
    id?: string;
    requesterId: string;
    donorId: string | null;
    bloodGroup: string;
    unitsRequired: number;
    hospitalName: string;
    hospitalAddress: string;
    city: string;
    patientName: string;
    phone: string;
    urgencyLevel: 'normal' | 'urgent' | 'critical';
    status: 'active' | 'matched' | 'completed' | 'cancelled' | 'expired';
    location: {
        latitude: number;
        longitude: number;
        geohash: string;
    };
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
    acceptedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
    completedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
    cooldownUntil: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
    updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}

export interface BloodMatch {
    id?: string;
    requestId: string;
    donorId: string;
    requesterId: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'failed' | 'cancelled';
    donorConfirmed?: boolean;
    requesterConfirmed?: boolean;
    donorConfirmedAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
    requesterConfirmedAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
    acceptedAt?: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
    updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}
