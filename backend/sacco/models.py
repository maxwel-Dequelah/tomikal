import base64
import uuid
from decimal import Decimal, ROUND_UP

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MinValueValidator
from django.conf import settings


def generate_short_uuid():
    uid = uuid.uuid4()
    short_uid = base64.urlsafe_b64encode(uid.bytes).rstrip(b'=').decode('utf-8')
    return short_uid[:12]


class User(AbstractUser):
    id = models.CharField(primary_key=True, default=generate_short_uuid, editable=False, max_length=12)
    dob = models.DateField(null=True, blank=True)
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    phoneNumber = models.CharField(max_length=10, unique=True)
    email = models.EmailField(null=True, blank=True)
    is_active = models.BooleanField(default=False)  # must be approved to activate
    is_admin = models.BooleanField(default=False)
    is_secretary = models.BooleanField(default=False)
    is_tresurer = models.BooleanField(default=False)  # Corrected typo here
    is_approved = models.BooleanField(default=False)  # Approval flag
    date_Approved = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} - {self.username}"


class Balance(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0.00)])
    lastEdited = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.first_name} - {self.user.phoneNumber} - Balance: {self.balance}"

    def adjust_balance(self, amount):
        new_balance = self.balance + amount
        if new_balance < 0:
            raise ValidationError("Insufficient balance.")
        self.balance = new_balance
        self.save()


class EmergencyFund(models.Model):
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, validators=[MinValueValidator(0.00)])

    def __str__(self):
        return f"Emergency Fund Balance: {self.balance:.2f}"

    def adjust_balance(self, amount):
        new_balance = self.balance + amount
        if new_balance < 0:
            raise ValidationError("Insufficient emergency fund balance.")
        self.balance = new_balance
        self.save()


class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('emergency', 'Emergency Deposit'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    SOURCE_CHOICES = [
        ('M-pesa', 'M-pesa'),
        ('Cash', 'Cash'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateTimeField(default=timezone.now)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=12, choices=TRANSACTION_TYPES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_transactions')
    balance_after = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='M-pesa')

    def __str__(self):
        return f"{self.user.username} - {self.transaction_type} - {self.amount} ({self.status})"

    def approve(self):
        if self.status != 'pending':
            raise ValidationError("Transaction already processed.")

        if self.transaction_type == 'deposit':
            self.user.balance.adjust_balance(self.amount)
        elif self.transaction_type == 'withdrawal':
            self.user.balance.adjust_balance(-self.amount)
        elif self.transaction_type == 'emergency':
            fund, _ = EmergencyFund.objects.get_or_create(id=1)
            fund.adjust_balance(self.amount)

        self.user.balance.refresh_from_db()
        self.balance_after = self.user.balance.balance
        self.status = 'approved'
        self.save()




# ==================================================# Loan Models==================================================

class LoanRequest(models.Model):
    STATUS_CHOICES = [
        ('pending_guarantors', 'Pending Guarantor Confirmation'),
        ('pending_treasurer', 'Pending Treasurer Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    requested_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='loan_requests_made',
        help_text="The user who initiated the loan request."
    )
    borrower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='loan_requests_received',
        help_text="The member for whom the loan is being requested."
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    purpose = models.TextField()
    guarantor1 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='guaranteed_loans_as_g1'
    )
    guarantor2 = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='guaranteed_loans_as_g2'
    )
    guarantor1_confirmed = models.BooleanField(default=False)
    guarantor2_confirmed = models.BooleanField(default=False)
    treasurer_approved = models.BooleanField(default=False)
    treasurer_rejected = models.BooleanField(default=False)
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='pending_guarantors'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    def clean(self):
        errors = {}

        # Ensure both guarantors are provided
        if not self.guarantor1 or not self.guarantor2:
            errors['guarantor1'] = "Two guarantors are required."
            errors['guarantor2'] = "Two guarantors are required."

        # Ensure guarantors are not the same person
        if self.guarantor1 and self.guarantor2 and self.guarantor1 == self.guarantor2:
            errors['guarantor2'] = "Guarantor 1 and Guarantor 2 must be different people."

        # Ensure neither guarantor is a treasurer or secretary
        restricted_roles = ['treasurer', 'secretary']
        if self.guarantor1 and self.guarantor1.role in restricted_roles:
            errors['guarantor1'] = "Treasurer or Secretary cannot be a guarantor."
        if self.guarantor2 and self.guarantor2.role in restricted_roles:
            errors['guarantor2'] = "Treasurer or Secretary cannot be a guarantor."

        # Ensure applicant is not their own guarantor
        if self.applicant in [self.guarantor1, self.guarantor2]:
            errors['guarantor1'] = "Applicant cannot be their own guarantor."
            errors['guarantor2'] = "Applicant cannot be their own guarantor."

        if errors:
            raise ValidationError(errors)
        
    def update_status(self):
        """Move the loan request through stages."""
        if self.guarantor1_confirmed and self.guarantor2_confirmed:
            self.status = 'pending_treasurer'
        if self.treasurer_approved:
            self.status = 'approved'
        elif self.treasurer_rejected:
            self.status = 'rejected'
        self.save()

    def __str__(self):
        return f"Loan #{self.id} for {self.borrower} - {self.amount}"


class LoanRepayment(models.Model):
    loan = models.ForeignKey(
        LoanRequest,
        on_delete=models.CASCADE,
        related_name='repayments'
    )
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Repayment {self.amount_paid} for Loan #{self.loan.id}"


class LoanGuarantorAction(models.Model):
    loan = models.ForeignKey(
        LoanRequest,
        on_delete=models.CASCADE,
        related_name='guarantor_actions'
    )
    guarantor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='guarantor_actions'
    )
    confirmed = models.BooleanField(
    null=True,
    default=None,
    help_text="None = pending, True = accepted, False = rejected"
)
    action_date = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """Update the loan request when both guarantors have confirmed."""
        super().save(*args, **kwargs)
        loan = self.loan
        if loan.guarantor1 == self.guarantor:
            loan.guarantor1_confirmed = self.confirmed
        elif loan.guarantor2 == self.guarantor:
            loan.guarantor2_confirmed = self.confirmed
        loan.update_status()

    def __str__(self):
        return f"Guarantor {self.guarantor} {'confirmed' if self.confirmed else 'declined'} Loan #{self.loan.id}"









# Signals
@receiver(post_save, sender=User)
def create_user_assets(sender, instance, created, **kwargs):
    if created:
        Balance.objects.create(user=instance)
        if not EmergencyFund.objects.exists():
            EmergencyFund.objects.create(balance=0.00)


@receiver(post_save, sender=User)
def update_balance_on_user_save(sender, instance, **kwargs):
    if hasattr(instance, 'balance'):
        instance.balance.save()


# RESET PASSWORD
from django.conf import settings

class PasswordResetOTP(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        return timezone.now() - self.created_at < timezone.timedelta(minutes=10)

    def __str__(self):
        return f"{self.user.username} - {self.otp_code}"
