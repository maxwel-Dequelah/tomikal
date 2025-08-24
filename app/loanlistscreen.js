// LoanListScreen.js
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoanListScreen() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [applyForSelf, setApplyForSelf] = useState(true);
  const [loans, setLoans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedLoans, setExpandedLoans] = useState({});
  const orgName = process.env.EXPO_PUBLIC_ORG_NAME || "waiting...";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const router = useRouter();

  const borrowerId = useMemo(() => {
    if (!user) return null;
    if (user.is_secretary || user.is_tresurer) {
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

        if (parsedUser?.is_secretary || parsedUser?.is_tresurer) {
          const usersRes = await axios.get(`${apiUrl}/api/users/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUsers(usersRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (borrowerId) {
      fetchLoans(borrowerId, statusFilter);
    } else {
      setLoans([]);
    }
  }, [borrowerId, statusFilter]);

  const fetchLoans = async (uid, status) => {
    if (!uid) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("access");
      let url = `${apiUrl}/api/loans/?=${uid}`;
      if (status) {
        url += `&status=${status}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLoans(res.data.filter((l) => l.borrower.id === uid));
      setExpandedLoans({});
    } catch (err) {
      console.error(err);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleApplyForSelf = (val) => {
    setApplyForSelf(val);
    setSelectedUser("");
    setLoans([]);
    if (val) {
      fetchLoans(user.id, statusFilter);
    }
  };

  const toggleExpand = (loanId) => {
    setExpandedLoans((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
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
            <Text style={styles.title}>Loan List</Text>

            {(user?.is_secretary || user?.is_tresurer) && (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.labelInline}>View my loans</Text>
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
                        onValueChange={(val) => setSelectedUser(val)}
                      >
                        <Picker.Item label="-- Select User --" value="" />
                        {users
                          .filter((u) => u.id !== user.id)
                          .map((u) => (
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

            {/* Status Filter */}
            <Text style={styles.label}>Filter by Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={setStatusFilter}
              >
                <Picker.Item label="All" value="" />
                <Picker.Item label="Pending" value="pending" />
                <Picker.Item
                  label="Awaiting Guarantors"
                  value="awaiting_guarantors"
                />
                <Picker.Item label="Approved" value="approved" />
                <Picker.Item label="Rejected" value="rejected" />
                <Picker.Item label="Repaid" value="repaid" />
              </Picker>
            </View>

            {/* Loans Table */}
            {loans.length === 0 ? (
              <Text>No loans found.</Text>
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
                      <Text style={styles.cell}>{loan.status}</Text>
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
                        <Text>
                          Guarantors:{" "}
                          {loan.guarantor1_confirmed &&
                          loan.guarantor2_confirmed
                            ? "100%"
                            : loan.guarantor1_confirmed ||
                              loan.guarantor2_confirmed
                            ? "50%"
                            : "0%"}
                        </Text>

                        <Text>
                          Repayment Progress: {loan.repayment_progress || 0}%
                        </Text>
                        <Text>Notes: {loan.notes || "N/A"}</Text>
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
