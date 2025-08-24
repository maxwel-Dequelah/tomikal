// LoanRequestScreen.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoanRequestScreen() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [applyForSelf, setApplyForSelf] = useState(false);

  const [guarantor1, setGuarantor1] = useState("");
  const [guarantor2, setGuarantor2] = useState("");
  const [guarantorError, setGuarantorError] = useState("");

  const [amount, setAmount] = useState(1);
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityError, setEligibilityError] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formDisabled, setFormDisabled] = useState(false);

  const [submitting, setSubmitting] = useState(false); // shows submitting state

  const router = useRouter();
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  const borrowerId = useMemo(() => {
    if (!user) return null;
    if (user.is_secretary) {
      return applyForSelf ? user.id : selectedUser || null;
    }
    return user.id;
  }, [user, applyForSelf, selectedUser]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = await AsyncStorage.getItem("access");
        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        const usersRes = await axios.get(`${apiUrl}/api/users/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(usersRes.data);

        // If not secretary, check own eligibility immediately
        if (!parsedUser?.is_secretary) {
          await checkEligibilityAndSet(parsedUser?.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const checkEligibilityAndSet = async (userId) => {
    if (!userId) return;
    try {
      const token = await AsyncStorage.getItem("access");
      let url = `${apiUrl}/api/loan/eligibility/?user_id=${userId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setEligibility(res.data);
      setEligibilityError("");
      setFormDisabled(false);

      const eligibleAmount = Number(res.data.eligible_amount || 0);
      const shares = Number(res.data.balance || 0);

      if (shares <= 0) {
        setEligibilityError("Borrower has 0 shares and cannot request a loan.");
        setFormDisabled(true);
      } else if (eligibleAmount <= 0) {
        setEligibilityError(
          "Borrower has a pending or unpaid loan, or a pending Loan request and cannot request another."
        );
        setFormDisabled(true);
      }
    } catch (err) {
      console.error(err);
      setEligibility(null);
      setEligibilityError("Failed to check borrower eligibility.");
      setFormDisabled(true);
    }
  };

  const handleUserChange = async (val) => {
    setSelectedUser(val);
    setGuarantor1("");
    setGuarantor2("");
    setGuarantorError("");
    if (val) {
      await checkEligibilityAndSet(val);
    } else {
      setEligibility(null);
      setEligibilityError("");
      setFormDisabled(false);
    }
  };

  const toggleApplyForSelf = async (val) => {
    setApplyForSelf(val);
    setGuarantor1("");
    setGuarantor2("");
    setGuarantorError("");
    if (val && user?.id) {
      setSelectedUser(String(user.id));
      await checkEligibilityAndSet(user.id);
    } else {
      setSelectedUser("");
      setEligibility(null);
      setEligibilityError("");
      setFormDisabled(false);
    }
  };

  const isAmountInvalid =
    !amount ||
    isNaN(parseFloat(amount)) ||
    parseFloat(amount) <= 0 ||
    (eligibility &&
      parseFloat(amount) > Number(eligibility.eligible_amount || 0));

  const isFormIncomplete =
    !eligibility ||
    Number(eligibility.eligible_amount || 0) <= 0 ||
    isAmountInvalid ||
    !guarantor1 ||
    !guarantor2 ||
    guarantor1 === guarantor2 ||
    (user?.is_secretary && !borrowerId);

  const filteredGuarantors = useMemo(() => {
    const borrowerNumericId = borrowerId ? Number(borrowerId) : null;
    return users.filter(
      (u) =>
        // !u.is_secretary &&
        // !u.is_tresurer &&
        borrowerNumericId === null || u.id !== borrowerNumericId
    );
  }, [users, borrowerId]);

  const borrowerOptions = useMemo(() => {
    if (!user) return users;
    return users.filter((u) => u.id !== user.id);
  }, [users, user]);

  const handleGuarantorChange = (which, value) => {
    if (which === 1) setGuarantor1(value);
    if (which === 2) setGuarantor2(value);

    const nextG1 = which === 1 ? value : guarantor1;
    const nextG2 = which === 2 ? value : guarantor2;

    if (nextG1 && nextG2 && nextG1 === nextG2) {
      setGuarantorError("Guarantor 1 and 2 must be different");
    } else {
      setGuarantorError("");
    }
  };

  const handleSubmit = async () => {
    if (guarantorError) return;
    if (!borrowerId) return;

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("access");
      const payload = {
        borrower: borrowerId,
        amount: parseFloat(amount),
        guarantor1_id: guarantor1,
        guarantor2_id: guarantor2,
      };

      await axios.post(
        `${apiUrl}/api/loans/request/?user_id=${borrowerId}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // show success alert, then navigate
      // Use Alert.alert on native & fallback to window.confirm/alert for web
      if (typeof window !== "undefined" && window.document) {
        // web
        window.alert("Loan request submitted successfully.");
        router.push("/dashboard");
      } else {
        Alert.alert("Success", "Loan request submitted successfully.", [
          { text: "OK", onPress: () => router.push("/dashboard") },
        ]);
      }
    } catch (err) {
      console.error(err);
      if (typeof window !== "undefined" && window.document) {
        window.alert("Failed to submit loan request. Please try again.");
      } else {
        Alert.alert(
          "Error",
          "Failed to submit loan request. Please try again later."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLogout = async () => {
    // Use Alert.alert for native; fallback to window.confirm for web
    if (typeof window !== "undefined" && window.document) {
      const ok = window.confirm("Are you sure you want to logout?");
      if (ok) {
        await AsyncStorage.clear();
        router.replace("/login");
      }
      return;
    }

    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/login");
        },
      },
    ]);
  };

  const canShowForm =
    !!eligibility &&
    Number(eligibility.eligible_amount || 0) > 0 &&
    !formDisabled;

  return (
    <View style={styles.page}>
      {/* HEADER */}
      <View style={styles.stickyHeader}>
        <ImageBackground
          source={require("./assets/sacco_logo.jpeg")}
          style={styles.headerBackground}
        >
          <Text style={styles.headerTitle}>Tomikal SHG</Text>
          <Text style={styles.accountText}>{user?.username}</Text>
          <Text style={styles.accountNumber}>
            {user
              ? `${String(user.first_name || "").toUpperCase()} ${String(
                  user.last_name || ""
                ).toUpperCase()}`
              : "waiting"}
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38a169" />
            <Text>Loading...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Request Loan</Text>

            {user?.is_secretary && (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.labelInline}>Apply for yourself</Text>
                  <Switch
                    value={applyForSelf}
                    onValueChange={toggleApplyForSelf}
                  />
                </View>

                {!applyForSelf && (
                  <>
                    <Text style={styles.label}>Select User</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={selectedUser}
                        onValueChange={handleUserChange}
                      >
                        <Picker.Item label="-- Select User --" value="" />
                        {borrowerOptions.map((u) => (
                          <Picker.Item
                            key={u.id}
                            label={`${u.first_name} ${u.last_name} - ${u.phoneNumber}`}
                            value={u.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  </>
                )}
              </>
            )}

            {eligibility && (
              <View style={{ marginVertical: 15 }}>
                <Text>Shares: {eligibility.balance}</Text>
                <Text>
                  Eligible Loan:{" "}
                  {Number(eligibility.eligible_amount || 0).toFixed(2)}
                </Text>
                {eligibilityError && (
                  <Text style={{ color: "red", marginTop: 5 }}>
                    {eligibilityError}
                  </Text>
                )}
              </View>
            )}

            {canShowForm && (
              <>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={[
                    styles.input,
                    isAmountInvalid && { borderColor: "red" },
                  ]}
                  placeholder="Enter loan amount"
                  value={String(amount)}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  editable={!formDisabled && !submitting}
                />
                {isAmountInvalid && (
                  <Text style={{ color: "red" }}>
                    Amount exceeds eligible loan limit
                  </Text>
                )}

                <Text style={styles.label}>Guarantor 1</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={guarantor1}
                    onValueChange={(val) => handleGuarantorChange(1, val)}
                    enabled={!formDisabled && !submitting}
                  >
                    <Picker.Item label="-- Select Guarantor 1 --" value="" />
                    {filteredGuarantors.map((u) => (
                      <Picker.Item
                        key={u.id}
                        label={`${u.first_name} ${u.last_name}`}
                        value={u.id}
                      />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Guarantor 2</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={guarantor2}
                    onValueChange={(val) => handleGuarantorChange(2, val)}
                    enabled={!formDisabled && !submitting}
                  >
                    <Picker.Item label="-- Select Guarantor 2 --" value="" />
                    {filteredGuarantors.map((u) => (
                      <Picker.Item
                        key={u.id}
                        label={`${u.first_name} ${u.last_name}`}
                        value={u.id}
                      />
                    ))}
                  </Picker>
                </View>

                {guarantorError ? (
                  <Text style={{ color: "red" }}>{guarantorError}</Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.button,
                    (isFormIncomplete ||
                      guarantorError ||
                      formDisabled ||
                      submitting) && {
                      backgroundColor: "gray",
                    },
                  ]}
                  disabled={
                    isFormIncomplete ||
                    !!guarantorError ||
                    formDisabled ||
                    submitting
                  }
                  onPress={handleSubmit}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Submit Loan Request</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

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
  label: { fontWeight: "600", marginTop: 10 },
  labelInline: { fontWeight: "600" },
  switchRow: {
    marginTop: 6,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginVertical: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#38a169",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  backButton: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#38a169",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  backButtonText: { color: "#fff", fontSize: 15 },
});
