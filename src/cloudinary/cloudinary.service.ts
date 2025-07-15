import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

interface CloudinaryUploadResult {
    secure_url: string;
    public_id: string;
    [key: string]: any;
}

@Injectable()
export class CloudinaryService {
    constructor() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) {
            console.error('Missing Cloudinary credentials:', {
                cloudName: !!cloudName,
                apiKey: !!apiKey,
                apiSecret: !!apiSecret
            });
            throw new Error('Cloudinary credentials not properly configured');
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        });

        console.log('Cloudinary configured successfully with cloud name:', cloudName);
    }

    async uploadVideo(file: Express.Multer.File): Promise<{
        videoUrl: string;
        videoPath: string;
        videoSize: number;
    }> {
        try {
            const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'video',
                        folder: 'lessons/videos',
                        format: 'mp4',
                        quality: 'auto',
                        transformation: [
                            { quality: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result as CloudinaryUploadResult);
                    }
                ).end(file.buffer);
            });

            return {
                videoUrl: result.secure_url,
                videoPath: result.public_id,
                videoSize: file.size
            };
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            throw new Error('Failed to upload video to Cloudinary');
        }
    }

    async deleteVideo(videoPath: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(videoPath, { resource_type: 'video' });
        } catch (error) {
            console.error('Cloudinary delete error:', error);
        }
    }

    // Tạo URL với transformation (resize, quality, etc.)
    getOptimizedVideoUrl(videoPath: string, options?: any): string {
        return cloudinary.url(videoPath, {
            resource_type: 'video',
            quality: 'auto',
            format: 'auto',
            ...options
        });
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'documents'): Promise<{
        fileUrl: string;
        filePath: string;
        fileSize: number;
        fileFormat: string;
    }> {
        try {
            // Determine resource type based on file mimetype
            let resourceType: 'image' | 'video' | 'raw' = 'raw'; // default for documents
            let uploadOptions: any = {
                resource_type: resourceType,
                folder: folder,
            };

            if (file.mimetype.startsWith('image/')) {
                resourceType = 'image';
                uploadOptions = {
                    resource_type: resourceType,
                    folder: folder,
                    quality: 'auto',
                    transformation: [
                        { quality: 'auto' }
                    ]
                };
            } else if (file.mimetype.startsWith('video/')) {
                resourceType = 'video';
                uploadOptions = {
                    resource_type: resourceType,
                    folder: folder,
                    quality: 'auto'
                };
            } else {
                // For documents (PDF, DOC, etc.), use raw resource type
                uploadOptions = {
                    resource_type: 'raw',
                    folder: folder,
                    // Keep original format for documents
                    use_filename: true,
                    unique_filename: true
                };
            }

            const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            resolve(result as CloudinaryUploadResult);
                        }
                    }
                ).end(file.buffer);
            });

            return {
                fileUrl: result.secure_url,
                filePath: result.public_id,
                fileSize: file.size,
                fileFormat: result.format || file.mimetype.split('/')[1]
            };
        } catch (error) {
            console.error('Cloudinary file upload error:', error);
            throw new Error('Failed to upload file to Cloudinary');
        }
    }

    async uploadImage(file: Express.Multer.File, folder: string = 'images'): Promise<{
        imageUrl: string;
        imagePath: string;
        imageSize: number;
        imageFormat: string;
    }> {
        try {
            const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'image',
                        folder: folder,
                        quality: 'auto',
                        transformation: [
                            { quality: 'auto' },
                            { width: 1920, height: 1080, crop: 'limit' } // Max size limit
                        ]
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result as CloudinaryUploadResult);
                    }
                ).end(file.buffer);
            });

            return {
                imageUrl: result.secure_url,
                imagePath: result.public_id,
                imageSize: file.size,
                imageFormat: result.format
            };
        } catch (error) {
            console.error('Cloudinary image upload error:', error);
            throw new Error('Failed to upload image to Cloudinary');
        }
    }

    async uploadDocument(file: Express.Multer.File, folder: string = 'documents'): Promise<{
        documentUrl: string;
        documentPath: string;
        documentSize: number;
        documentFormat: string;
    }> {
        try {
            const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        resource_type: 'raw', // Use 'raw' for documents
                        folder: folder,
                        // Keep original filename and extension
                        public_id: `${Date.now()}_${file.originalname.split('.')[0]}`,
                        format: file.originalname.split('.').pop() // Preserve original extension
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result as CloudinaryUploadResult);
                    }
                ).end(file.buffer);
            });

            return {
                documentUrl: result.secure_url,
                documentPath: result.public_id,
                documentSize: file.size,
                documentFormat: result.format || file.originalname.split('.').pop() || 'unknown'
            };
        } catch (error) {
            console.error('Cloudinary document upload error:', error);
            throw new Error('Failed to upload document to Cloudinary');
        }
    }

    // ✅ THÊM HÀM DELETE FILE (GENERIC)
    async deleteFile(filePath: string, resourceType: 'image' | 'video' | 'raw' = 'raw'): Promise<void> {
        try {
            await cloudinary.uploader.destroy(filePath, { resource_type: resourceType });
            console.log(`File deleted successfully: ${filePath}`);
        } catch (error) {
            console.error('Cloudinary delete error:', error);
        }
    }

    // ✅ THÊM HÀM DELETE IMAGE
    async deleteImage(imagePath: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(imagePath, { resource_type: 'image' });
        } catch (error) {
            console.error('Cloudinary delete image error:', error);
        }
    }

    async deleteDocument(documentPath: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(documentPath, { resource_type: 'raw' });
        } catch (error) {
            console.error('Cloudinary delete document error:', error);
        }
    }

    getOptimizedImageUrl(imagePath: string, options?: any): string {
        return cloudinary.url(imagePath, {
            resource_type: 'image',
            quality: 'auto',
            format: 'auto',
            ...options
        });
    }

    getFileUrl(filePath: string, resourceType: 'image' | 'video' | 'raw' = 'raw'): string {
        return cloudinary.url(filePath, {
            resource_type: resourceType
        });
    }

    validateFileType(file: Express.Multer.File, allowedTypes: string[]): boolean {
        return allowedTypes.some(type => file.mimetype.includes(type));
    }

    async getFileInfo(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'raw') {
        try {
            const result = await cloudinary.api.resource(publicId, { resource_type: resourceType });
            return {
                url: result.secure_url,
                format: result.format,
                size: result.bytes,
                createdAt: result.created_at,
                width: result.width,
                height: result.height
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            throw new Error('Failed to get file information');
        }
    }
}