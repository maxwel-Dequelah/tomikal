// LoanApprovalScreen.js
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  TouchableOpacity,
  View,
} from "react-native";

export default function LoanApprovalScreen() {
  const [user, setUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLoans, setExpandedLoans] = useState({});
  const orgName = process.env.EXPO_PUBLIC_ORG_NAME || "waiting...";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const router = useRouter();

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const token = await AsyncStorage.getItem("access");
        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        const res = await axios.get(
          `${apiUrl}/api/loans/?status=pending_treasurer`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setLoans(res.data.filter((l) => l.status === "pending_treasurer"));
      } catch (err) {
        console.error(err);
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, []);

  const toggleExpand = (loanId) => {
    setExpandedLoans((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  const approveLoan = async (loanId) => {
    try {
      const token = await AsyncStorage.getItem("access");
      await axios.put(
        `${apiUrl}/api/loans/${loanId}/approve/`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", "Loan approved successfully!");
      setLoans((prev) => prev.filter((loan) => loan.id !== loanId));
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to approve loan.");
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
            <Text>Loading pending approvals...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Pending Loan Approvals</Text>

            {loans.length === 0 ? (
              <Text>No pending loans found.</Text>
            ) : (
              <View style={styles.table}>
                {/* Table Header */}
                <View style={[styles.row, styles.headerRow]}>
                  <Text style={[styles.cell, styles.headerCell]}>Borrower</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Amount</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Due</Text>
                  <Text style={[styles.cell, styles.headerCell]}></Text>
                </View>

                {/* Table Rows */}
                {loans.map((loan) => (
                  <View key={loan.id}>
                    <View style={styles.row}>
                      <Text style={styles.cell}>
                        {loan.borrower.first_name} {loan.borrower.last_name}
                      </Text>
                      <Text style={styles.cell}>{loan.amount}</Text>
                      <Text style={styles.cell}>
                        {loan.due_date
                          ? new Date(loan.due_date).toLocaleDateString()
                          : "-"}
                      </Text>
                      <TouchableOpacity
                        style={styles.cell}
                        onPress={() => toggleExpand(loan.id)}
                      >
                        <AntDesign
                          name={
                            expandedLoans[loan.id]
                              ? "minuscircleo"
                              : "pluscircleo"
                          }
                          size={20}
                          color="#38a169"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Expanded Details */}
                    {expandedLoans[loan.id] && (
                      <View style={styles.expanded}>
                        <Text>ID: {loan.id}</Text>
                        <Text>
                          Created: {new Date(loan.created_at).toLocaleString()}
                        </Text>
                        <Text>Purpose: {loan.purpose || "N/A"}</Text>
                        <Text>Status: {loan.status}</Text>

                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => approveLoan(loan.id)}
                        >
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
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
  table: { marginTop: 10, borderWidth: 1, borderColor: "#ddd" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  headerRow: { backgroundColor: "#f0f0f0" },
  cell: {
    flex: 1,
    padding: 8,
    fontSize: 12,
    textAlign: "center",
  },
  headerCell: { fontWeight: "bold", fontSize: 13 },
  expanded: {
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  approveButton: {
    marginTop: 10,
    backgroundColor: "#38a169",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButtonText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
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
