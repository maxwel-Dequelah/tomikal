from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.db.models import Q

from ..models import LoanGuarantorAction, User, Transaction, Balance, LoanRequest, EmergencyFund
from .serializers import (
    GuarantorRequestSerializer, LoanApprovalSerializer, RegisterSerializer, LoginSerializer, UserSerializer, UpdateProfileSerializer,
    TransactionSerializer, BalanceSerializer,
    EmergencyFundSerializer,
    UserApprovalSerializer,
    PendingUserSerializer,
    LoanSerializer,
    LoanCreateSerializer,
    GuarantorDecisionSerializer
)
# pending user approval

class PendingUsersListView(generics.ListAPIView):
    serializer_class = PendingUserSerializer

    def get_queryset(self):
        return User.objects.filter(is_active=False, is_approved=False)
    
# Helper for token generation
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

# Registration View
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": UserSerializer(user).data,
            "message": "User registered successfully. Please log in."
        }, status=status.HTTP_201_CREATED)

# Login View
class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        tokens = get_tokens_for_user(user)
        return Response({
            "tokens": tokens,
            "user": UserSerializer(user).data
        })

# Profile Update
class UpdateProfileView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UpdateProfileSerializer

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
            if user != request.user:
                return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            serializer = self.get_serializer(user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

# User List View (Admin Only)
class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


# users approve view
class ApproveOrRejectUserView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserApprovalSerializer

    def update(self, request, *args, **kwargs):
        user = get_object_or_404(User, pk=kwargs.get("pk"))
        serializer = self.get_serializer(user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Action processed successfully."}, status=status.HTTP_200_OK)

# Transaction List View (Admin or User)
class TransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_tresurer:  # your model has is_admin flag too
            return Transaction.objects.all().order_by('-date')
        return Transaction.objects.filter(user=user).order_by('-date')

# Transaction Create View
class TransactionCreateView(generics.CreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = User.objects.get(id=self.request.data.get('user'))
        serializer.save(user=user, status='pending')  # Save with pending status only




class TransactionUpdateView(generics.UpdateAPIView):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminUser]

    def update(self, request, *args, **kwargs):
        transaction = self.get_object()

        if transaction.status == 'approved':
            return Response({"error": "Transaction already approved."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            balance_record = Balance.objects.get(user=transaction.user)
        except Balance.DoesNotExist:
            raise ValidationError("Balance record not found.")

        if transaction.transaction_type == 'withdrawal':
            if balance_record.balance < transaction.amount:
                raise ValidationError("Insufficient balance.")
            balance_record.adjust_balance(-transaction.amount)

        elif transaction.transaction_type == 'deposit':
            balance_record.adjust_balance(transaction.amount)

        elif transaction.transaction_type == 'emergency':
            fund, _ = EmergencyFund.objects.get_or_create(id=1, defaults={"balance": 0.00})
            fund.adjust_balance(transaction.amount)

        transaction.status = 'approved'
        transaction.balance_after = balance_record.balance
        transaction.save()

        return Response({"success": "Transaction approved successfully."}, status=status.HTTP_200_OK)

# Current User's Transactions Only
class UserTransactionListView(generics.ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user).order_by('-date')

# Balance View
class BalanceRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = BalanceSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Assumes Balance object always exists due to signals
        return self.request.user.balance

# ============================================Loan ==================================================================

class LoanCreateView(generics.CreateAPIView):
    """
    Secretary can request a loan for themselves or on behalf of another user.
    """
    serializer_class = LoanCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # If secretary is creating on behalf of someone else, 'user' is passed in request data
        target_user_id = self.request.data.get("user")
        if target_user_id:
            # Treasurer can also use this endpoint if needed
            target_user = get_object_or_404(User, id=target_user_id)
        else:
            # Default to logged in user
            target_user = self.request.user

        serializer.save(borrower=target_user, requested_by=self.request.user,)


class LoanListView(generics.ListAPIView):
    """
    Default loan list:
    - Treasurer & Secretary: see all loans
    - Others: see only their own loans
    """
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_treasurer", False) or getattr(user, "is_secretary", False):
            return LoanRequest.objects.all().order_by("-created_at")
        return LoanRequest.objects.filter(user=user).order_by("-created_at")


class LoanAdminListView(generics.ListAPIView):
    """
    Admin loan view (only Treasurer & Secretary).
    Shows all loans without restrictions.
    """
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_treasurer", False) or getattr(user, "is_secretary", False):
            return LoanRequest.objects.all().order_by("-created_at")
        raise PermissionDenied("You are not authorized to view all loans.")





class LoanApprovalView(generics.UpdateAPIView):
    """
    Treasurer approves or rejects a loan request.
    """
    serializer_class = LoanApprovalSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LoanRequest.objects.filter(status="Pending")

    def update(self, request, *args, **kwargs):
        loan = self.get_object()

        if request.user.role != "Treasurer":
            return Response(
                {"error": "Only the Treasurer can approve or reject loans."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(loan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(approved_by=request.user)

        return Response(serializer.data, status=status.HTTP_200_OK)
    

class LoanEligibilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_user_id = request.query_params.get("user_id")

        if target_user_id:
            try:
                target_user = User.objects.get(id=target_user_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "Target user not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            target_user = request.user

        try:
            balance = Balance.objects.get(user=target_user)
            multiplier = getattr(settings, "LOAN_MULTIPLIER", 3)  # Default to 3x
            eligible_amount = balance.balance * multiplier

            # 🔹 Check for pending or unpaid loans
            existing_loan = LoanRequest.objects.filter(
                borrower=target_user
            ).exclude(status="paid").first()

            if existing_loan:
                return Response({
                    "user_id": target_user.id,
                    "balance": balance.balance,
                    "multiplier": multiplier,
                    "eligible_amount": 0,  # Force 0 if loan exists
                    "pending_loan_amount": existing_loan.amount,
                    "pending_loan_status": existing_loan.status
                })

            return Response({
                "user_id": target_user.id,
                "balance": balance.balance,
                "multiplier": multiplier,
                "eligible_amount": eligible_amount
            })

        except Balance.DoesNotExist:
            return Response(
                {"error": "Balance record not found for the specified user."},
                status=status.HTTP_404_NOT_FOUND
            )


# LOAN GUARANTOR ACTIONS

class PendingGuarantorRequestsView(generics.ListAPIView):
    serializer_class = GuarantorRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return LoanRequest.objects.filter(
            status="pending_guarantors"
        ).filter(
            Q(guarantor1=user, guarantor1_confirmed=False)
            | Q(guarantor2=user, guarantor2_confirmed=False)
        )


class GuarantorDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, loan_id):
        user = request.user

        try:
            loan = LoanRequest.objects.get(id=loan_id, status="pending_guarantors")
        except LoanRequest.DoesNotExist:
            return Response({"error": "Loan not found or not awaiting guarantors."}, status=status.HTTP_404_NOT_FOUND)

        # Ensure the user is actually a guarantor
        if user not in [loan.guarantor1, loan.guarantor2]:
            return Response({"error": "You are not a guarantor for this loan."}, status=status.HTTP_403_FORBIDDEN)

        # Find or create guarantor action record
        action, _ = LoanGuarantorAction.objects.get_or_create(
            loan=loan,
            guarantor=user,
        )

        serializer = GuarantorDecisionSerializer(instance=action, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"message": "Decision recorded successfully."})







# =============================================Emergency Fund =========================================================
# Emergency Fund Request
class EmergencyFundView(generics.CreateAPIView):
    serializer_class = EmergencyFundSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        # Assuming emergency fund requests can be created here
        serializer.save(user=self.request.user)

class EmergencyFundAdminView(generics.ListAPIView):
    serializer_class = EmergencyFundSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return EmergencyFund.objects.all()






from ..models import PasswordResetOTP
from .serializers import PasswordResetRequestSerializer, PasswordResetConfirmSerializer



class PasswordResetRequestView(generics.CreateAPIView):
    serializer_class = PasswordResetRequestSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data["phone"]
        user = User.objects.get(phoneNumber=phone)
        code = str(random.randint(100000, 999999))

        PasswordResetOTP.objects.create(user=user, code=code)

        full_number = f"+254{phone[-9:]}"
        try:
            pywhatkit.sendwhatmsg_instantly(full_number, f"Your OTP is: {code}", wait_time=5, tab_close=True)
        except Exception as e:
            print("WhatsApp error:", e)

        return Response({"message": "OTP sent successfully"}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(generics.CreateAPIView):
    serializer_class = PasswordResetConfirmSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        otp_obj = serializer.validated_data["otp_obj"]
        new_password = serializer.validated_data["new_password"]

        user.set_password(new_password)
        user.save()
        otp_obj.delete()

        return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)