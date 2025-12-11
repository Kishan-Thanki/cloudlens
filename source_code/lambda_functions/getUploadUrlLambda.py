import os
import json
import boto3
import uuid

s3 = boto3.client('s3')
UPLOADS_BUCKET = os.environ['UPLOADS_BUCKET']

def lambda_handler(event, context):
    # 1. CORS Pre-flight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST"
            },
            "body": ""
        }

    # 2. Parse Input
    try:
        body = json.loads(event.get('body') or "{}")
    except:
        return {"statusCode": 400, "body": "Invalid JSON"}

    filename = body.get('filename')
    filetype = body.get('type')
    action = body.get('action') # 'watermark' or 'thumbnail'
    
    # New inputs
    custom_text = body.get('customText', '')
    custom_size = body.get('customSize', '')

    if not filename or not filetype or not action:
        return {"statusCode": 400, "body": json.dumps({"error": "Missing fields"})}

    # 3. Create Key
    key = f"{action}/{uuid.uuid4()}_{filename}"

    # 4. Prepare Metadata for S3
    # We pass these so the Processor Lambda can read them later
    s3_params = {
        'Bucket': UPLOADS_BUCKET,
        'Key': key,
        'ContentType': filetype,
        'Metadata': {}
    }
    
    if action == 'watermark' and custom_text:
        s3_params['Metadata']['custom-text'] = custom_text
    elif action == 'thumbnail' and custom_size:
        s3_params['Metadata']['custom-size'] = str(custom_size)

    # 5. Generate Signed URL
    try:
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params=s3_params,
            ExpiresIn=300
        )
    except Exception as e:
        return {"statusCode": 500, "body": str(e)}

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "POST"
        },
        "body": json.dumps({
            "uploadUrl": presigned_url,
            "key": key
        })
    }