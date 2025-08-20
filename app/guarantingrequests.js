// GuarantingRequests.js
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

export default function GuarantingRequests() {
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequests, setExpandedRequests] = useState({});
  const orgName = process.env.EXPO_PUBLIC_ORG_NAME || "waiting...";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const router = useRouter();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = await AsyncStorage.getItem("access");
        const storedUser = await AsyncStorage.getItem("user");
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        await fetchRequests();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = await AsyncStorage.getItem("access");
      const res = await axios.get(`${apiUrl}/api/guarantor/requests/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(res.data);
    } catch (err) {
      console.error(err);
      setRequests([]);
    }
  };

  const handleDecision = async (loanId, decision) => {
    try {
      const token = await AsyncStorage.getItem("access");
      await axios.post(
        `${apiUrl}/api/guarantor/decision/${loanId}/`,
        { decision },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", `Request ${decision}`);
      fetchRequests(); // refresh list
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not record decision");
    }
  };

  const toggleExpand = (reqId) => {
    setExpandedRequests((prev) => ({
      ...prev,
      [reqId]: !prev[reqId],
    }));
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
            <Text style={styles.title}>Guarantor Requests</Text>

            {requests.length === 0 ? (
              <Text>No pending guarantor requests.</Text>
            ) : (
              <View style={styles.table}>
                {/* Table Header */}
                <View style={[styles.row, styles.headerRow]}>
                  <Text style={[styles.cell, styles.headerCell]}>Borrower</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Amount</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Due</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Status</Text>
                  <Text style={[styles.cell, styles.headerCell]}></Text>
                </View>

                {/* Table Rows */}
                {requests.map((req) => (
                  <View key={req.id}>
                    <View style={styles.row}>
                      <Text style={styles.cell}>
                        {req.borrower.first_name} {req.borrower.last_name}
                      </Text>
                      <Text style={styles.cell}>{req.amount_requested}</Text>
                      <Text style={styles.cell}>
                        {req.due_date
                          ? new Date(req.due_date).toLocaleDateString()
                          : "-"}
                      </Text>
                      <Text style={styles.cell}>{req.status}</Text>
                      <TouchableOpacity
                        style={styles.cell}
                        onPress={() => toggleExpand(req.id)}
                      >
                        <AntDesign
                          name={
                            expandedRequests[req.id]
                              ? "minuscircleo"
                              : "pluscircleo"
                          }
                          size={20}
                          color="#38a169"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Expanded Details */}
                    {expandedRequests[req.id] && (
                      <View style={styles.expanded}>
                        <Text>ID: {req.id}</Text>
                        <Text>
                          Created: {new Date(req.created_at).toLocaleString()}
                        </Text>
                        <Text>Notes: {req.notes || "N/A"}</Text>
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: "green" },
                            ]}
                            onPress={() => handleDecision(req.id, "approved")}
                          >
                            <Text style={styles.actionText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: "red" },
                            ]}
                            onPress={() => handleDecision(req.id, "rejected")}
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

      {/* Back Button */}
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
    marginTop: 10,
    justifyContent: "space-around",
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    borderRadius: 6,
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
