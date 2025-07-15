import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';

// Option 1: Sử dụng require (Recommended)
const serviceAccount = require('../../firebase-service-account.json');

// Option 2: Sử dụng env vars (Alternative)
// Không cần import serviceAccount nếu dùng env vars

@Injectable()
export class FirebaseService {
    constructor() {
        if (!admin.apps.length) {
            try {
                // Option 1: Sử dụng service account file
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                console.log('✅ Firebase Admin initialized successfully');
            } catch (error) {
                console.error('❌ Firebase Admin initialization error:', error);
                
                // Option 2: Fallback to environment variables
                try {
                    admin.initializeApp({
                        credential: admin.credential.cert({
                            projectId: process.env.FIREBASE_PROJECT_ID || 'online-learning-f9d31',
                            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        }),
                    });
                    console.log('✅ Firebase Admin initialized with env vars');
                } catch (envError) {
                    console.error('❌ Firebase Admin env initialization error:', envError);
                }
            }
        }
    }

    async sendNotificationToTokens(tokens: string[], title: string, body: string) {
        console.log('Firebase sendNotificationToTokens called with:');
        console.log('Tokens:', tokens);
        console.log('Title:', title);
        console.log('Body:', body);

        try {
            const message = {
                notification: { title, body },
                tokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            console.log('Firebase response:', response);
            return response;
        } catch (error) {
            console.error('Firebase send error:', error);
            throw error;
        }
    }

    async sendNotificationToToken(tokens: string[], title: string, body: string) {
        console.log('Firebase sendNotificationToToken called with:');
        console.log('Tokens:', tokens);
        console.log('Title:', title);
        console.log('Body:', body);

        try {
            // Filter out mock tokens
            const realTokens = tokens.filter(token => 
                token && 
                token !== 'mock-token-1' && 
                token !== 'mock-token-2' && 
                token !== 'mock-token-3' &&
                token.length > 50 // FCM tokens are usually longer
            );

            if (realTokens.length === 0) {
                console.log('⚠️ No valid FCM tokens found, using mock response');
                return {
                    successCount: 0,
                    failureCount: tokens.length,
                    responses: tokens.map(token => ({
                        success: false,
                        error: { code: 'invalid-token', message: 'Mock token detected' }
                    }))
                };
            }

            const message = {
                notification: { title, body },
                tokens: realTokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            console.log('Firebase response:', response);
            return response;
        } catch (error) {
            console.error('Firebase send error:', error);
            throw error;
        }
    }

    async sendNotificationToTopic(topic: string, title: string, body: string) {
        try {
            const response = await admin.messaging().send({
                notification: { title, body },
                topic,
            });
            console.log('Firebase topic response:', response);
            return response;
        } catch (error) {
            console.error('Firebase topic send error:', error);
            throw error;
        }
    }
}
