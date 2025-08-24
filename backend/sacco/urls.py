from django.urls import path
from .api.views import (
    ApproveOrRejectUserView, GuarantorDecisionView, LoanApprovalView, LoanListView, RegisterView, LoginView,
    UpdateProfileView, UserListView,
    TransactionListView, TransactionCreateView, UserTransactionListView,
    BalanceRetrieveUpdateView,
    EmergencyFundView, EmergencyFundAdminView,
    TransactionUpdateView,
    PasswordResetRequestView, PasswordResetConfirmView,
    PendingUsersListView,
    # Also add this if not already imported
    LoanCreateView,            # Import LoanCreateView to fix the error
    LoanEligibilityView,       # Import LoanEligibilityView to fix the error
    LoanAdminListView,         # Import LoanAdminListView to fix the error
    PendingGuarantorRequestsView,

    
    LoanRepaymentCreateView,
    LoanRepaymentListView,
    LoanRepaymentApprovalView,
)




urlpatterns = [
    # Authentication
    path('signup/', RegisterView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),

    # User Profile & List
    path('users/<str:pk>/update/', UpdateProfileView.as_view(), name='update-profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/pending/', PendingUsersListView.as_view(), name='pending-users'),
    path('users/approve/<str:pk>/', ApproveOrRejectUserView.as_view(), name='approve-reject-user'),
    


    # Transactions
    path('transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('transactions/create/', TransactionCreateView.as_view(), name='transaction-create'),
    path('transactions/my/', UserTransactionListView.as_view(), name='user-transactions'),
    path('transactions/<str:pk>/', TransactionUpdateView.as_view(), name = 'approve transuction'),

    # Balance
    path('balance/', BalanceRetrieveUpdateView.as_view(), name='balance'),

    # Loans
   path('loans/request/', LoanCreateView.as_view(), name='loan-create'),
   path("loans/", LoanListView.as_view(), name="loan-list"),
   path("loans-admin-view/", LoanAdminListView.as_view(), name="loan-admin-list"),

    path('loans/<int:pk>/approve/', LoanApprovalView.as_view(), name='loan-approval'),
    path('loan/eligibility/', LoanEligibilityView.as_view(), name='loan-eligibility'),
    path("guarantor/requests/", PendingGuarantorRequestsView.as_view(), name="guarantor-pending"),

    # Endpoint for guarantors to accept/reject a loan request
    path("guarantor/decision/", GuarantorDecisionView.as_view(), name="guarantor-decision"),

    path("repayments/", LoanRepaymentListView.as_view(), name="repayment-list"),
    path("repayments/create/", LoanRepaymentCreateView.as_view(), name="repayment-create"),
    path("repayments/<int:pk>/approve/", LoanRepaymentApprovalView.as_view(), name="repayment-approve"),



    # Emergency Funds
    path('emergency-funds/request/', EmergencyFundView.as_view(), name='emergency-fund-request'),
    path('emergency-funds/admin/', EmergencyFundAdminView.as_view(), name='emergency-fund-admin'),
    path('api/passwordreset/', PasswordResetRequestView.as_view(), name="request-password-reset-otp"),
    path("api/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
]
