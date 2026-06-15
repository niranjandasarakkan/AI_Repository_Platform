import json
import pdfplumber
import zipfile
import io
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Candidate, JobPosting, ScreeningResult
from .tasks import run_screening_pipeline
from rest_framework.decorators import api_view
from rest_framework.response import Response
from celery.result import AsyncResult

@csrf_exempt
def screen_candidate(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            candidate_text = data.get('candidate_profile', '')
            job_text = data.get('job_description', '')
            
            candidate = Candidate.objects.create(name="External Applicant", raw_profile=candidate_text)
            job = JobPosting.objects.create(title="API Job Posting", description=job_text)
            
            task = run_screening_pipeline.delay(candidate.id, job.id)
            
            return JsonResponse({
                "status": "success", 
                "message": "AI Screening initialized successfully.", 
                "task_id": task.id
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=400)
            
    return JsonResponse({"error": "Only POST requests allowed"}, status=405)

@api_view(['GET'])
def check_screening_status(request, task_id):
    task = AsyncResult(task_id)
    
    if task.state == 'SUCCESS':
        result = ScreeningResult.objects.latest('created_at')
        return Response({
            "status": "completed",
            "match_score": result.match_score,
            "summary": result.ai_summary
        })
    elif task.state == 'FAILURE':
        return Response({"status": "error", "message": "The AI Agents encountered an error."})
    else:
        return Response({"status": "processing"})

@api_view(['POST'])
def extract_pdf_text(request):
    if 'file' not in request.FILES:
        return Response({"error": "No file uploaded."}, status=400)
    
    pdf_file = request.FILES['file']
    extracted_text = ""
    
    try:
        with pdfplumber.open(pdf_file) as pdf:
            for page in pdf.pages:
                extracted_text += page.extract_text() + "\n"
        return Response({"text": extracted_text.strip()})
    except Exception as e:
        return Response({"error": f"Failed to read PDF: {str(e)}"}, status=500)

@api_view(['GET'])
def get_screening_history(request):
    try:
        recent_results = ScreeningResult.objects.all().order_by('-created_at')[:10]
        
        history = [
            {
                "id": res.id,
                "score": res.match_score,
                "summary_preview": res.ai_summary[:100] + "..." if res.ai_summary else "No summary available.",
                "date": res.created_at.strftime("%b %d, %Y")
            } for res in recent_results
        ]
        return Response({"history": history})
    except Exception as e:
        return Response({"error": f"Failed to fetch history: {str(e)}"}, status=500)
    
# NEW: Perfectly flush with the left margin!
@api_view(['POST'])
def bulk_screen_candidates(request):
    if 'file' not in request.FILES:
        return Response({"error": "No ZIP file uploaded."}, status=400)
    
    zip_upload = request.FILES['file']
    job_text = request.POST.get('job_description', 'No description provided')
    
    job = JobPosting.objects.create(title="Bulk Batch Upload", description=job_text)
    
    queued_tasks = []
    
    try:
        with zipfile.ZipFile(zip_upload, 'r') as z:
            for filename in z.namelist():
                if filename.lower().endswith('.pdf') and not filename.startswith('__MACOSX'):
                    
                    with z.open(filename) as pdf_file:
                        extracted_text = ""
                        with pdfplumber.open(pdf_file) as pdf:
                            for page in pdf.pages:
                                extracted_text += (page.extract_text() or "") + "\n"
                    
                    candidate = Candidate.objects.create(name=filename, raw_profile=extracted_text.strip())
                    task = run_screening_pipeline.delay(candidate.id, job.id)
                    
                    queued_tasks.append({
                        "filename": filename,
                        "task_id": task.id
                    })
                    
        return Response({
            "status": "success", 
            "message": f"Successfully queued {len(queued_tasks)} resumes for AI analysis.",
            "tasks": queued_tasks
        })
        
    except zipfile.BadZipFile:
        return Response({"error": "Invalid ZIP file format."}, status=400)
    except Exception as e:
        return Response({"error": f"Bulk upload failed: {str(e)}"}, status=500)