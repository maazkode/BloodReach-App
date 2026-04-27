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
    lastDonationDate: FirebaseFirestoreTypes.Timestamp | null;
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
    createdAt: FirebaseFirestoreTypes.FieldValue;
    updatedAt: FirebaseFirestoreTypes.FieldValue;
}

export interface DonationRequest {
    id?: string;
    requesterId: string;
    bloodGroup: string;
    unitsRequired: number;
    hospitalName: string;
    hospitalAddress: string;
    city: string;
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
    donationDate: FirebaseFirestoreTypes.Timestamp | null;
    createdAt: FirebaseFirestoreTypes.Timestamp | FirebaseFirestoreTypes.FieldValue;
}
