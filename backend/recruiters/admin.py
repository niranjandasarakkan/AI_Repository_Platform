from django.contrib import admin
from .models import JobPosting, Candidate, ScreeningResult

admin.site.register(JobPosting)
admin.site.register(Candidate)
admin.site.register(ScreeningResult)