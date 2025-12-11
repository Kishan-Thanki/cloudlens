import os
import boto3
import io
import math
from PIL import Image, ImageDraw, ImageFont

s3 = boto3.client('s3')
rek = boto3.client('rekognition')

# Environment Variables
UPLOADS_BUCKET = os.environ['UPLOADS_BUCKET']
THUMB_BUCKET = os.environ['THUMB_BUCKET']
WATERMARK_BUCKET = os.environ['WATERMARK_BUCKET']
QUARANTINE_BUCKET = os.environ['QUARANTINE_BUCKET']
MIN_CONFIDENCE = 80

def handler(event, context):
    for rec in event.get('Records', []):
        try:
            bucket = rec['s3']['bucket']['name']
            key = rec['s3']['object']['key']
            
            if '/' not in key: return

            # 1. Fetch Object + Metadata
            # We need the metadata (custom text/size) provided by the user
            response = s3.get_object(Bucket=bucket, Key=key)
            metadata = response.get('Metadata', {})
            content_type = response.get('ContentType', 'image/jpeg')
            image_content = response['Body'].read()

            action = key.split('/')[0].lower()
            object_name = key.split('/', 1)[1]
            
            print(f"Processing: {key} | Action: {action} | Meta: {metadata}")

            # 2. MANDATORY SECURITY CHECK (Rekognition)
            # Every single image is checked before processing
            rek_resp = rek.detect_moderation_labels(
                Image={'Bytes': image_content}, # Use bytes to avoid re-reading
                MinConfidence=MIN_CONFIDENCE
            )
            
            if rek_resp.get('ModerationLabels'):
                print(f"⚠️ UNSAFE CONTENT DETECTED: {key}")
                # Move to Quarantine
                s3.put_object(Bucket=QUARANTINE_BUCKET, Key=object_name, Body=image_content, ContentType=content_type)
                s3.delete_object(Bucket=bucket, Key=key)
                return # Stop processing immediately

            print("✅ Image Safe. Proceeding to task.")

            # 3. Perform Requested Task
            if action == 'watermark':
                # Get text from metadata, default to "CloudLens" if missing
                user_text = metadata.get('custom-text', 'CloudLens')
                create_watermark(image_content, content_type, user_text, object_name)

            elif action == 'thumbnail':
                # Get size from metadata, default to 300
                try:
                    size = int(metadata.get('custom-size', 300))
                except:
                    size = 300
                create_thumbnail(image_content, content_type, size, object_name)
            
            # Clean up input bucket
            s3.delete_object(Bucket=bucket, Key=key)

        except Exception as e:
            print(f"Error: {str(e)}")
            return

def create_thumbnail(img_bytes, content_type, size, name):
    print(f"Creating Thumbnail size: {size}px")
    img = Image.open(io.BytesIO(img_bytes))
    
    # Validation: Restrict max size to avoid memory crash
    if size > 1000: size = 1000
    if size < 50: size = 50

    img.thumbnail((size, size), Image.Resampling.LANCZOS)
    
    out = io.BytesIO()
    fmt = img.format if img.format else 'JPEG'
    img.save(out, format=fmt, quality=95)
    out.seek(0)
    
    s3.put_object(Bucket=THUMB_BUCKET, Key=name, Body=out, ContentType=content_type)

def create_watermark(img_bytes, content_type, text, name):
    print(f"Watermarking with text: {text}")
    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    
    # 1. Dynamic Font Size
    target_font_size = int(img.width * 0.15)
    try:
        font = ImageFont.load_default(size=target_font_size)
    except:
        font = ImageFont.load_default()
        
    draw_temp = ImageDraw.Draw(img)
    bbox = draw_temp.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    diagonal = int(math.sqrt(text_width**2 + text_height**2))
    txt_layer = Image.new('RGBA', (diagonal, diagonal), (0, 0, 0, 0))
    draw_txt = ImageDraw.Draw(txt_layer)

    txt_x = (diagonal - text_width) / 2
    txt_y = (diagonal - text_height) / 2

    # 45% Opacity Style
    draw_txt.text((txt_x + 5, txt_y + 5), text, font=font, fill=(0, 0, 0, 115))
    draw_txt.text((txt_x, txt_y), text, font=font, fill=(255, 255, 255, 115))

    rotated_txt = txt_layer.rotate(45, resample=Image.BICUBIC, expand=1)

    center_x = int((img.width - rotated_txt.width) / 2)
    center_y = int((img.height - rotated_txt.height) / 2)
    
    overlay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    overlay.paste(rotated_txt, (center_x, center_y), rotated_txt)
    
    final_img = Image.alpha_composite(img, overlay)

    out = io.BytesIO()
    if content_type == 'image/png':
        final_img.save(out, format='PNG')
    else:
        final_img = final_img.convert("RGB")
        final_img.save(out, format='JPEG', quality=95)
        
    out.seek(0)
    s3.put_object(Bucket=WATERMARK_BUCKET, Key=name, Body=out, ContentType=content_type)