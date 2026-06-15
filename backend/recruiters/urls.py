from django.urls import path
from . import views

urlpatterns = [
    path('api/screen/', views.screen_candidate, name='screen_candidate'),
    path('api/screen/status/<str:task_id>/', views.check_screening_status, name='check_status'),
    path('api/upload-pdf/', views.extract_pdf_text, name='extract_pdf_text'), 
    path('api/history/', views.get_screening_history, name='get_history'),
    
    # NEW: The Enterprise Bulk Endpoint
    path('api/bulk-screen/', views.bulk_screen_candidates, name='bulk_screen'),
]