☁️ CloudLens - Serverless Content Moderation & Processing Pipeline

Course: IT457 Cloud Computing | Group: 34

Institute: Dhirubhai Ambani Institute of Information and Communication Technology (DA-IICT)

📌 Project Overview

CloudLens is a fully serverless, event-driven cloud application built on AWS. It provides a secure and automated pipeline for users to upload images, which are then automatically moderated for inappropriate content using AI and processed according to user requirements (Watermarking or Thumbnail generation).

The entire architecture is designed to be scalable, cost-efficient, and maintainable, leveraging the power of AWS Lambda, S3, API Gateway, and Amazon Rekognition.

🚀 Key Features

🛡️ Automated AI Moderation: Every uploaded image is scanned by Amazon Rekognition. Unsafe content is automatically flagged and quarantined.

⚡ Serverless Architecture: Zero server management. Scales automatically with traffic using AWS Lambda.

🔒 Secure Uploads: Uses S3 Presigned URLs to allow direct, secure browser-to-S3 uploads without exposing credentials.

🖼️ Image Processing:

Watermarking: Adds a custom, semi-transparent text watermark (diagonal & centered).

Thumbnail Generation: Resizes images to user-defined dimensions while maintaining aspect ratio.

📂 Batch Processing: Supports uploading multiple images or entire folders at once.

📦 Zip Download: Automatically bundles multiple processed images into a single ZIP file for easy download.

📊 Monitoring: Integrated CloudWatch dashboard for real-time metrics and logs.

🏗️ Architecture

The system follows a 3-Tier Serverless Architecture:

Frontend (Presentation Layer): A static website hosted on Amazon S3, built with HTML5, CSS3, and JavaScript. It handles user interactions, file selection, and displays results.

API Layer: Amazon API Gateway acts as the secure entry point, triggering Lambda functions to generate upload credentials.

Backend (Logic & Data Layer):

AWS Lambda: Executes business logic (Auth, Moderation, Processing).

Amazon S3: Stores raw uploads, processed outputs, and quarantined files.

Amazon Rekognition: Provides AI-powered content safety analysis.

Data Flow

User selects file(s) -> Frontend requests secure URL from API Gateway.

Lambda generates Presigned URL -> Frontend uploads file directly to uploads-bucket.

S3 Upload Event triggers Processor Lambda.

Processor Lambda:

Calls Rekognition to check for unsafe content.

If Unsafe ❌: Moves to quarantine-bucket.

If Safe ✅: Processes (Watermark/Thumbnail) -> Saves to output-bucket.

Frontend polls for the result and provides a download link.

🛠️ Tech Stack & AWS Services

Category

Technology / Service

Usage

Frontend

HTML5, CSS3, JS

User Interface & Client-side logic

Compute

AWS Lambda (Python 3.13)

Serverless backend logic

Storage

Amazon S3

Object storage for files & hosting

API

Amazon API Gateway

HTTP API endpoint management

AI/ML

Amazon Rekognition

Content moderation (Safety check)

Libraries

Pillow (PIL)

Python image processing (Layer)

Monitoring

Amazon CloudWatch

Logs, Metrics, and Dashboards

Security

AWS IAM

Role-based access control

📂 Project Structure

G34_CloudLens/
├── source_code/
│   ├── frontend/          # HTML, CSS, JS files for the web interface
│   ├── processor/         # Lambda function code for image processing (app.py)
│   ├── uploader/          # Lambda function code for presigned URLs (lambda_function.py)
│   └── layer/             # Instructions/Script for building the Pillow Lambda Layer
│
├── aws_configuration/
│   ├── policies/          # JSON files for IAM Roles and S3 Bucket Policies
│
│
├── G34_Report.pdf     # Detailed final project report
│── presentation.pptx  # Project presentation slides   
├── G34_video.mp4          # Video demonstration of the working project
└── README.md              # This file


⚙️ Setup & Deployment

Prerequisites

AWS Account (Free Tier recommended)

Python 3.13 installed locally (for layer creation if needed)

1. Infrastructure Setup (AWS)

Create S3 Buckets:

cloudlens-g34-static (Enable Static Website Hosting)

cloudlens-g34-uploads (Private, CORS enabled)

cloudlens-g34-thumbnails (Public Read Policy)

cloudlens-g34-watermarked (Public Read Policy)

cloudlens-g34-quarantine (Private)

Create IAM Roles:

LambdaExecutionRole: Permissions for S3 (Read/Write/Delete), CloudWatch Logs, and Rekognition.

2. Backend Deployment

GetUploadUrl Lambda:

Create function -> Upload source_code/uploader zip.

Set Env Var: UPLOADS_BUCKET.

Connect to API Gateway.

Processor Lambda:

Create function -> Upload source_code/processor zip.

Add Pillow Layer (Python 3.13 compatible).

Set Env Vars: UPLOADS_BUCKET, THUMB_BUCKET, WATERMARK_BUCKET, QUARANTINE_BUCKET.

Increase Timeout (30s) and Memory (512MB).

Add S3 Trigger (All Object Create events from uploads bucket).

3. Frontend Deployment

Update script.js with your specific API Gateway URL and Bucket URLs.

Upload index.html, style.css, script.js, and cloudlens_logo.png to the cloudlens-g34-static bucket.

Access the application via the S3 Website Endpoint URL.

👥 Contributors (Group 34)

Nitesh Sachade (202412083): Backend Logic, Rekognition Integration

Swara Chokshi (202412015): Infrastructure, Security (IAM), Monitoring

Kishan Thanki (202412117): Image Processing (Pillow), Lambda Layers

Stuti Shah (202412109): Frontend Development, API Integration

For detailed technical information, please refer to the G34_Report.pdf located in the root directory.