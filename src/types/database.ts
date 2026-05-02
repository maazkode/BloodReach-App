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
    // address: string;
    fcmToken?: string;
    email: string;
    photoURL: string;
    isVerified: boolean;
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
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
    updatedAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}

export interface Donation {
    id?: string;
    requestId: string;
    donorId: string;
    requesterId: string;
    status: 'pending' | 'approved' | 'completed';
    donationDate: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue | null;
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}
