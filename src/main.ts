import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:4000'], // Frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Apply ValidationPipe with transformations enabled
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    whitelist: true
  }));
  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Online Learning API')
    .setDescription('API documentation for Online Learning system')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Giữ token sau khi refresh
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log('Application is running on: http://localhost:3000');
  console.log('Swagger UI is available at: http://localhost:3000/api');
}
bootstrap();
