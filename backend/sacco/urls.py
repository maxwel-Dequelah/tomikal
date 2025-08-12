from django.urls import path
from .api.views import (
    ApproveOrRejectUserView, RegisterView, LoginView,
    UpdateProfileView, UserListView,
    TransactionListView, TransactionCreateView, UserTransactionListView,
    BalanceRetrieveUpdateView,
    LoanRequestView, LoanListView, LoanApproveView,
    EmergencyFundView, EmergencyFundAdminView,
    TransactionUpdateView,
    PasswordResetRequestView, PasswordResetConfirmView,
    PendingUsersListView
)

urlpatterns = [
    # Authentication
    path('signup/', RegisterView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    # path('users/<int:pk>/approve/', ApproveUserView.as_view(), name='approve-user'),
    # User Profile & List
    path('users/<str:pk>/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/pending/', PendingUsersListView.as_view(), name='pending-users'),
    path('users/approve/<str:pk>/', ApproveOrRejectUserView.as_view(), name='approve-reject-user'),
    # path('users/<str:pk>/reject/', ApproveUserView.as_view(), name='reject-user'),


    # Transactions
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('transactions/create/', TransactionCreateView.as_view(), name='transaction-create'),
    path('transactions/my/', UserTransactionListView.as_view(), name='user-transactions'),
    path('transactions/<str:pk>/', TransactionUpdateView.as_view(), name = 'approve transuction'),

    # Balance
    path('balance/', BalanceRetrieveUpdateView.as_view(), name='balance'),

    # Loans
    path('loans/request/', LoanRequestView.as_view(), name='loan-request'),
    path('loans/', LoanListView.as_view(), name='loan-list'),
    path('loans/<int:pk>/approve/', LoanApproveView.as_view(), name='loan-approve'),

    # Emergency Funds
    path('emergency-funds/request/', EmergencyFundView.as_view(), name='emergency-fund-request'),
    path('emergency-funds/admin/', EmergencyFundAdminView.as_view(), name='emergency-fund-admin'),
    path('api/passwordreset/', PasswordResetRequestView.as_view(), name="request-password-reset-otp"),
    path("api/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
