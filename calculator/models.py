from django.db import models
from django.contrib.auth.models import User

class ArchiveRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='archive_records')
    local_id = models.IntegerField(help_text="IndexedDB ID")
    patient_name = models.CharField(max_length=255)
    owner_name = models.CharField(max_length=255, blank=True, null=True)
    ward_box = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    calculator_type = models.CharField(max_length=100)
    weight = models.FloatField(blank=True, null=True)
    species = models.CharField(max_length=100, blank=True, null=True)
    inputs = models.JSONField(blank=True, null=True)
    results = models.JSONField(blank=True, null=True)
    audit = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField()
    synced_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'local_id')
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.patient_name} - {self.calculator_type}"
