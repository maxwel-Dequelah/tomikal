import datetime
from decimal import Decimal
from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import authenticate
from django.db import models
from ..models import LoanRepayment, User, Transaction, Balance, EmergencyFund, LoanRequest, PasswordResetOTP, LoanGuarantorAction


# User Serializer
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'phoneNumber', 'dob',
            'email', 'is_active', 'is_admin', 'is_approved', 'username', 'is_secretary', 'is_tresurer'
        ]
        read_only_fields = ['id', 'is_admin', 'is_active', 'is_approved','is_secretary', 'is_tresurer']


# Register Serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phoneNumber', 'dob', 'email', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(
            phoneNumber=validated_data['phoneNumber'],
            dob=validated_data['dob'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            email=validated_data.get('email'),
            username=validated_data['phoneNumber'],
            is_active=False,
            is_approved=False
        )
        user.set_password(password)
        user.save()
        return user


# Login Serializer
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        username = data.get("username")
        password = data.get("password")

        if username and password:
            user = authenticate(username=username, password=password)
            if user is None:
                raise serializers.ValidationError("Invalid username or password.")
            if not user.is_approved:
                raise serializers.ValidationError("Account not approved.")
            if not user.is_active:
                raise serializers.ValidationError("Account not activated.")
        else:
            raise serializers.ValidationError("Must provide both username and password.")
        
        data['user'] = user
        return data


# Transaction Serializer
class TransactionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    transaction_type = serializers.ChoiceField(choices=Transaction.TRANSACTION_TYPES)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['status', 'created_by', 'balance_after']

    def validate(self, data):
        print(data)     
        if data['transaction_type'] == 'withdrawal':
            if data['amount'] <= 0:
                raise serializers.ValidationError("Withdrawal amount must be positive.")
        elif data['amount'] <= 0:
            raise serializers.ValidationError("Amount must be positive.")

        return data

    def create(self, validated_data):
        request_user = self.context['request'].user
        validated_data['created_by'] = request_user   
        validated_data['status'] = 'pending'
        validated_data['user'] = validated_data['user']
        validated_data['balance_after'] = 0  # Will be updated upon approval
        return Transaction.objects.create(**validated_data)


# User Approval Serializer
class UserApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])

    def update(self, instance, validated_data):
        action = validated_data.get("action")

        if action == "approve":
            instance.is_active = True
            instance.is_approved = True
            instance.date_Approved = timezone.now()
            instance.save()
        elif action == "reject":
            instance.delete()

        return instance

# pending user approval serializer
class PendingUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__"

# 🔄 NEW Serializer to Approve Transaction and Update Balance
# class TransactionStatusUpdateSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = Transaction
#         fields = ['action']

#     def update(self, instance, validated_data):
#         new_status = validated_data.get('action')
#         if new_status == 'approve' and instance.status != 'pending':
#             instance.approve()
#         elif new_status == 'reject' and instance.status == 'pending':
#             instance.status = 'rejected'
#             instance.save()
#         else:
#             raise serializers.ValidationError("Only transition to 'approved' is supported.")
#         return instance
# ✅ Serializer cleanly handles action
class TransactionStatusUpdateSerializer(serializers.ModelSerializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'],write_only=True)

    class Meta:
        model = Transaction
        fields = ['action',"status"]

    def update(self, instance, validated_data):
        action = validated_data['action']

        if action == 'approve':
            instance.approve()
        elif action == 'reject':
            instance.reject()
        else:
            raise serializers.ValidationError("Invalid action.")

        return instance


# Balance Serializer
class BalanceSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Balance
        fields = ['user', 'balance', 'lastEdited']


# Emergency Fund Serializer
class EmergencyFundSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = EmergencyFund
        fields = ['user', 'amount']

# ==================================================== Loan Serializers ====================================================

class LoanGuarantorSerializer(serializers.ModelSerializer):
    """Serializer for displaying guarantor details inside Loan"""
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class LoanSerializer(serializers.ModelSerializer):
    """Main Loan serializer for listing and retrieving loans"""
    requested_by = UserSerializer(read_only=True)
    borrower = UserSerializer(read_only=True)



    class Meta:
        model = LoanRequest
        fields = "__all__"
    def to_representation(self, instance):
        # auto-refresh repayment status before showing
        instance.update_repayment_status()
        return super().to_representation(instance)  


class LoanCreateSerializer(serializers.ModelSerializer):
    """Serializer for secretary or user to request a loan"""
    guarantor1_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="guarantor1",
        write_only=True,
        required=False
    )
    guarantor2_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="guarantor2",
        write_only=True,
        required=False
    )

    class Meta:
        model = LoanRequest
        fields = ["borrower", "amount", "guarantor1_id", "guarantor2_id"]

    def create(self, validated_data):
        request_user = self.context["request"].user
        validated_data["requested_by"] = request_user
        return LoanRequest.objects.create(**validated_data)
    
    def to_representation(self, instance):
        # auto-refresh repayment status before showing
        instance.update_repayment_status()
        return super().to_representation(instance)

# serializers.py
from rest_framework import serializers
from django.conf import settings
from datetime import date, timedelta

class LoanApprovalSerializer(serializers.ModelSerializer):
    approved_amount = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False
    )
    total_due = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False
    )

    class Meta:
        model = LoanRequest
        fields = ["approved_amount", "total_due", "due_date", "status"]

    def validate(self, attrs):
        loan = self.instance
        approved_amount = attrs.get("approved_amount", loan.amount)

        # must not exceed requested
        if approved_amount > loan.amount:
            raise serializers.ValidationError(
                {"approved_amount": "Approved amount cannot exceed requested amount."}
            )
        return attrs

    def update(self, instance, validated_data):
        approved_amount = validated_data.get("approved_amount", instance.amount)
        total_due = validated_data.get("total_due")

        # set amountApproved
        instance.amountApproved = approved_amount

        # set due_date = today + 12 months
        instance.due_date = date.today() + timedelta(days=365)

        # compute total_due if not provided
        if not total_due:
            interest_rate = getattr(settings, "LOAN_INTEREST_RATE", 0.1)  # e.g., 10%
            total_due = approved_amount * Decimal(1 + interest_rate/100)  # Simple interest calculation

        instance.total_due = total_due

        # mark approved
        instance.status = "approved"
        instance.treasurer_approved = True
        instance.approved_at = datetime.datetime.now()

        instance.save()
        return instance

# ===================================== Loan Repayment Serializer =========================================
# ===================================== Loan Repayment Serializer =========================================
class LoanRepaymentSerializer(serializers.ModelSerializer):
    loan = LoanSerializer(read_only=True)  # nested object (for response only)
    loan_id = serializers.PrimaryKeyRelatedField(
        queryset=LoanRequest.objects.all(),
        source="loan",
        write_only=True
    )
    created_by = UserSerializer(read_only=True)
    approved_by = UserSerializer(read_only=True)
    approved = serializers.BooleanField(read_only=True)

    class Meta:
        model = LoanRepayment
        fields = [
            "id",
            "loan", "loan_id",          # accept loan_id in request, return loan in response
            "amount_paid",              # must be in request
            "method",                   # must be in request
            "payment_date",             # auto (set in model default or overridden in view)
            "installment_number",       # auto/computed, not required
            "balance_after_payment",    # auto
            "penalty",                  # auto
            "notes",                    # optional
            "created_by",
            "approved_by",
            "approved",
        ]
        read_only_fields = [
            "loan", "payment_date", "installment_number",
            "balance_after_payment", "penalty",
            "created_by", "approved_by", "approved"
        ]
    def to_representation(self, instance):
        # auto-refresh repayment status before showing
        instance.update_repayment_status()
        return super().to_representation(instance)

    def create(self, validated_data):
        user = self.context["request"].user
        if not getattr(user, "is_secretary", False):
            raise serializers.ValidationError(
                {"error": "Only secretary can record a repayment."}
            )

        loan = validated_data.pop("loan")
        if loan.status != "approved":
            raise serializers.ValidationError(
                {"error": "Cannot record repayment for unapproved loan."}
            )

        repayment = LoanRepayment.objects.create(
            loan=loan,
            created_by=user,
            status="pending",   # pending approval
            **validated_data
        )
        return repayment




class LoanRepaymentApprovalSerializer(serializers.ModelSerializer):
    """Treasurer approves or rejects repayment"""
    action = serializers.ChoiceField(choices=["approve", "reject"])

    class Meta:
        model = LoanRepayment
        fields = ["action"]
    def check_loan_fully_repaid(self, loan):
        if loan.amount_repaid >= loan.total_due:
            loan.status = "repaid"
            loan.save()
    def update(self, instance, validated_data):
        user = self.context["request"].user
        if not user.is_tresurer:
            raise serializers.ValidationError(
                {"error": "Only treasurer can approve/reject repayments."}
            )

        action = validated_data["action"]

        if action == "approve":
            if instance.status == "approved":
                raise serializers.ValidationError(
                    {"error": "Repayment already approved."}
                )

            # update loan balance
            loan = instance.loan
            loan.amount_repaid += instance.amount_paid
            loan.save()

            # update repayment record
            instance.status = "approved"
            instance.approved_by = user
            instance.balance_after_payment = (
                loan.total_due - loan.amount_repaid
            )
            instance.save()

        elif action == "reject":
            instance.delete()
            return None

        return instance



# LOAN GUARANTOR SERIALIZER ACTIONS

class GuarantorRequestSerializer(serializers.ModelSerializer):
    borrower = UserSerializer(read_only=True)
    requested_by = UserSerializer(read_only=True)
    class Meta:
        model = LoanRequest
        fields = [
            "id",
            "borrower",
            "requested_by",
            "amount",
            "purpose",
            "status",
            "created_at",
        ]

# serializers.py
class GuarantorDecisionSerializer(serializers.ModelSerializer):
    decision = serializers.SerializerMethodField()

    class Meta:
        model = LoanGuarantorAction
        fields = ["id", "loan", "guarantor", "decision"]

    def get_decision(self, obj):
        if obj.confirmed is True:
            return "accept"
        elif obj.confirmed is False:
            return "reject"
        return "pending"  # None = pending

    def update(self, instance, validated_data):
        decision = self.context["request"].data.get("decision")
        if decision == "accept":
            instance.confirmed = True
        elif decision == "reject":
            instance.confirmed = False
        instance.save()
        return instance


# ==================================== Password Reset Serializers ===============================================

class PasswordResetRequestSerializer(serializers.Serializer):
    phone = serializers.CharField()

    def validate_phone(self, value):
        try:
            user = User.objects.get(phoneNumber=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this phone number does not exist.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    phone = serializers.CharField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=6)

    def validate(self, data):
        phone = data.get("phone")
        otp = data.get("otp")
        try:
            user = User.objects.get(phoneNumber=phone)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        try:
            otp_obj = PasswordResetOTP.objects.filter(user=user, code=otp).latest("created_at")
        except PasswordResetOTP.DoesNotExist:
            raise serializers.ValidationError("Invalid OTP.")

        if otp_obj.is_expired():
            raise serializers.ValidationError("OTP has expired.")

        data["user"] = user
        data["otp_obj"] = otp_obj
        return data
    
# ==================================== UpdateProfileSerializer ===============================================
class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phoneNumber', 'dob', 'email']
        read_only_fields = ['is_active', 'is_approved']

    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phoneNumber = validated_data.get('phoneNumber', instance.phoneNumber)
        instance.dob = validated_data.get('dob', instance.dob)
        instance.email = validated_data.get('email', instance.email)
        instance.save()
        return instance