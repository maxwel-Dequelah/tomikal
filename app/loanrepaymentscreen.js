// LoanRepaymentScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoanRepaymentScreen() {
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const orgName = process.env.EXPO_PUBLIC_ORG_NAME || "waiting...";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (!parsedUser?.is_secretary) {
          Alert.alert(
            "Access Denied",
            "Only the secretary can record repayments."
          );
          router.replace("/dashboard");
          return;
        }

        const token = await AsyncStorage.getItem("access");
        const res = await axios.get(`${apiUrl}/api/loans/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // filter unpaid + approved
        const unpaidLoans = res.data.filter(
          (loan) =>
            loan.status === "approved" &&
            parseFloat(loan.total_due) > parseFloat(loan.amount_repaid)
        );

        setLoans(unpaidLoans);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load loans.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRepayment = async () => {
    if (!selectedLoan || !repaymentAmount) {
      Alert.alert("Validation", "Please select a loan and enter an amount.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("access");
      await axios.post(
        `${apiUrl}/api/repayments/create/`,
        {
          loan_id: selectedLoan,
          amount_paid: repaymentAmount,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", "Repayment recorded successfully.");
      setRepaymentAmount("");
      setSelectedLoan("");
      router.push("/dashboard");
    } catch (err) {
      console.error(err.response?.data || err);
      Alert.alert("Error", "Failed to record repayment.");
    }
  };

  return (
    <View style={styles.page}>
      {/* HEADER */}
      <View style={styles.stickyHeader}>
        <ImageBackground
          source={require("./assets/sacco_logo.jpeg")}
          style={styles.headerBackground}
        >
          <Text style={styles.headerTitle}>{orgName}</Text>
          <Text style={styles.accountText}>{user?.username}</Text>
          <Text style={styles.accountNumber}>
            {user
              ? `${String(user.first_name || "").toUpperCase()} ${String(
                  user.last_name || ""
                ).toUpperCase()}`
              : "waiting"}
          </Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              await AsyncStorage.clear();
              router.replace("/login");
            }}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38a169" />
            <Text>Loading loans...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Record Loan Repayment</Text>

            <Text style={styles.label}>Select Loan</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedLoan}
                onValueChange={(val) => setSelectedLoan(val)}
              >
                <Picker.Item label="-- Select Loan --" value="" />
                {loans.map((loan) => {
                  const remaining =
                    parseFloat(loan.total_due) - parseFloat(loan.amount_repaid);
                  return (
                    <Picker.Item
                      key={loan.id}
                      label={`${loan.borrower.first_name} ${loan.borrower.last_name} | Remaining: ${remaining}`}
                      value={loan.id}
                    />
                  );
                })}
              </Picker>
            </View>

            {selectedLoan && (
              <View style={styles.loanDetails}>
                {(() => {
                  const loan = loans.find((l) => l.id === selectedLoan);
                  if (!loan) return null;
                  const remaining =
                    parseFloat(loan.total_due) - parseFloat(loan.amount_repaid);
                  return (
                    <>
                      <Text>Total Due: {loan.total_due}</Text>
                      <Text>Amount Repaid: {loan.amount_repaid}</Text>
                      <Text>Remaining: {remaining}</Text>
                    </>
                  );
                })()}
              </View>
            )}

            <Text style={styles.label}>Repayment Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={repaymentAmount}
              onChangeText={setRepaymentAmount}
            />

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleRepayment}
            >
              <Text style={styles.submitText}>Submit Repayment</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Footer back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/dashboard")}
      >
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  stickyHeader: { zIndex: 10 },
  headerBackground: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  accountText: { color: "#fff", fontSize: 18 },
  accountNumber: { color: "#fff", fontSize: 16, marginTop: 5 },
  logoutButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: "#e53e3e",
    borderRadius: 5,
  },
  logoutText: { color: "#fff", fontSize: 14 },
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
    paddingBottom: 120,
  },
  loadingContainer: { marginTop: 50, alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { fontWeight: "600", marginTop: 15 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginVertical: 10,
  },
  loanDetails: {
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  submitButton: {
    backgroundColor: "#38a169",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  backButton: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#4a5568",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  backButtonText: { color: "#fff", fontSize: 15 },
});
