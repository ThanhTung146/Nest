import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class AwsS3Service {
    private s3: AWS.S3;
    private bucketName: string | undefined;

    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
        });
        this.bucketName = process.env.AWS_S3_BUCKET_NAME;
    }

    async uploadVideo(file: Express.Multer.File, fileName: string): Promise<{
        videoUrl: string;
        videoSize: number;
        videoPath: string;
    }> {
        if (!this.bucketName) {
            throw new Error('AWS_S3_BUCKET_NAME is not defined');
        }

        const uploadParams = {
            Bucket: this.bucketName,
            Key: `lessons/videos/${fileName}`,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read', // Set to public-read to allow access
        };

        try {
            const result = await this.s3.upload(uploadParams).promise();
            return {
                videoUrl: result.Location,
                videoSize: file.size,
                videoPath: result.Key,
            }; // URL of the uploaded video
        } catch (error) {
            console.error('Error uploading video to S3:', error);
            throw new Error('Failed to upload video');
        }
    }

    async deleteVideo(videoPath: string): Promise<void> {
        if (!this.bucketName) {
            throw new Error('AWS_S3_BUCKET_NAME is not defined');
        }
        if (!videoPath) {
            throw new Error('Video path is required for deletion');
        }
        const deleteParams = {
            Bucket: this.bucketName,
            Key: videoPath,
        };
        try {
            await this.s3.deleteObject(deleteParams).promise();
        } catch (error) {
            console.error('S3 delete error:', error);
        }
    }
}
