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

export default function RepaymentListScreen() {
  const [user, setUser] = useState(null);
  const [repayments, setRepayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRepayments, setExpandedRepayments] = useState({});
  const orgName = process.env.EXPO_PUBLIC_ORG_NAME || "waiting...";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const router = useRouter();

  useEffect(() => {
    const fetchRepayments = async () => {
      try {
        const token = await AsyncStorage.getItem("access");
        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (!parsedUser?.is_tresurer) {
          Alert.alert("Error", "Only Treasurer can view this page.");
          router.replace("/dashboard");
          return;
        }

        const res = await axios.get(`${apiUrl}/api/repayments/`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setRepayments(res.data.filter((r) => !r.approved));
      } catch (err) {
        console.error(err.response?.data || err.message);
        setRepayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRepayments();
  }, []);

  const toggleExpand = (repaymentId) => {
    setExpandedRepayments((prev) => ({
      ...prev,
      [repaymentId]: !prev[repaymentId],
    }));
  };

  const handleAction = async (repaymentId, action) => {
    try {
      const token = await AsyncStorage.getItem("access");

      const res = await axios.patch(
        `${apiUrl}/api/repayments/${repaymentId}/approve/`,
        { action },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 200) {
        Alert.alert("Success", res.data.message || "Repayment updated.");
        setRepayments(
          (prev) => prev.filter((r) => r.id !== repaymentId) // remove after update
        );
      }
    } catch (err) {
      console.error(err.response?.data || err.message);
      Alert.alert("Error", err.response?.data?.error || "Something went wrong");
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
            <Text>Loading...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Pending Repayments</Text>

            {repayments.length === 0 ? (
              <Text>No repayments awaiting approval.</Text>
            ) : (
              <View style={styles.table}>
                {/* Header Row */}
                <View style={[styles.row, styles.headerRow]}>
                  <Text style={[styles.cell, styles.headerCell]}>Borrower</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Loan ID</Text>
                  <Text style={[styles.cell, styles.headerCell]}>
                    Amount Paid
                  </Text>
                  <Text style={[styles.cell, styles.headerCell]}></Text>
                </View>

                {/* Repayment Rows */}
                {repayments.map((repayment) => (
                  <View key={repayment.id}>
                    <View style={styles.row}>
                      <Text style={styles.cell}>
                        {repayment.loan.borrower.first_name}{" "}
                        {repayment.loan.borrower.last_name}
                      </Text>
                      <Text style={styles.cell}>{repayment.loan.id}</Text>
                      <Text style={styles.cell}>{repayment.amount_paid}</Text>
                      <TouchableOpacity
                        style={styles.cell}
                        onPress={() => toggleExpand(repayment.id)}
                      >
                        <AntDesign
                          name={
                            expandedRepayments[repayment.id]
                              ? "minuscircleo"
                              : "pluscircleo"
                          }
                          size={20}
                          color="#38a169"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Expanded Details */}
                    {expandedRepayments[repayment.id] && (
                      <View style={styles.expanded}>
                        <Text>ID: {repayment.id}</Text>
                        <Text>Method: {repayment.method}</Text>
                        <Text>
                          Payment Date:{" "}
                          {new Date(
                            repayment.payment_date
                          ).toLocaleDateString()}
                        </Text>
                        <Text>Notes: {repayment.notes || "N/A"}</Text>

                        {/* Approve / Reject */}
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "green" },
                            ]}
                            onPress={() =>
                              handleAction(repayment.id, "approve")
                            }
                          >
                            <Text style={styles.actionText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionBtn,
                              { backgroundColor: "red" },
                            ]}
                            onPress={() => handleAction(repayment.id, "reject")}
                          >
                            <Text style={styles.actionText}>Reject</Text>
                          </TouchableOpacity>
                        </View>
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  actionBtn: {
    padding: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: "center",
  },
  actionText: { color: "#fff", fontWeight: "bold" },
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
