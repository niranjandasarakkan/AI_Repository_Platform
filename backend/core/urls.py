from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # THIS is the missing link that connects your API!
    path('', include('recruiters.urls')), 
]