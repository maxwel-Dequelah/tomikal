// TransactionApprovalScreen.js
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

export default function TransactionApprovalScreen() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [applyForSelf, setApplyForSelf] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedTx, setExpandedTx] = useState({});
  const orgName = process.env.EXPO_PUBLIC_ORG_NAME || "waiting...";
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const router = useRouter();

  const targetUserId = useMemo(() => {
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
    if (targetUserId) {
      fetchTransactions(targetUserId, statusFilter);
    } else {
      setTransactions([]);
    }
  }, [targetUserId, statusFilter]);

  const fetchTransactions = async (uid, status) => {
    if (!uid) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("access");
      let url = `${apiUrl}/api/transactions/?user=${uid}`;
      if (status) {
        url += `&status=${status}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(res.data.filter((t) => t.user.id === uid));
      setExpandedTx({});
    } catch (err) {
      console.error(err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleApplyForSelf = (val) => {
    setApplyForSelf(val);
    setSelectedUser("");
    setTransactions([]);
    if (val) {
      fetchTransactions(user.id, statusFilter);
    }
  };

  const toggleExpand = (txId) => {
    setExpandedTx((prev) => ({
      ...prev,
      [txId]: !prev[txId],
    }));
  };

  const handleAction = async (id, action) => {
    try {
      const token = await AsyncStorage.getItem("access");
      await axios.patch(
        `${apiUrl}/api/transactions/${id}/`,
        { status: action }, // approved / rejected
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTransactions(targetUserId, statusFilter);
    } catch (err) {
      console.error(err.response?.data || err.message);
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
            <Text style={styles.title}>Transaction Approvals</Text>

            {(user?.is_secretary || user?.is_tresurer) && (
              <>
                <View style={styles.switchRow}>
                  <Text style={styles.labelInline}>View my transactions</Text>
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
                <Picker.Item label="Approved" value="approved" />
                <Picker.Item label="Rejected" value="rejected" />
              </Picker>
            </View>

            {/* Transactions Table */}
            {transactions.length === 0 ? (
              <Text>No transactions found.</Text>
            ) : (
              <View style={styles.table}>
                {/* Header */}
                <View style={[styles.row, styles.headerRow]}>
                  <Text style={[styles.cell, styles.headerCell]}>User</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Type</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Amount</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Source</Text>
                  <Text style={[styles.cell, styles.headerCell]}>Status</Text>
                  <Text style={[styles.cell, styles.headerCell]}></Text>
                </View>

                {/* Rows */}
                {transactions.map((tx) => (
                  <View key={tx.id}>
                    <View style={styles.row}>
                      <Text style={styles.cell}>
                        {tx.user.first_name} {tx.user.last_name}
                      </Text>
                      <Text style={styles.cell}>{tx.transaction_type}</Text>
                      <Text style={styles.cell}>KES {tx.amount}</Text>
                      <Text style={styles.cell}>{tx.source}</Text>
                      <Text style={styles.cell}>{tx.status}</Text>
                      <TouchableOpacity
                        style={styles.cell}
                        onPress={() => toggleExpand(tx.id)}
                      >
                        <AntDesign
                          name={
                            expandedTx[tx.id] ? "minuscircleo" : "pluscircleo"
                          }
                          size={20}
                          color="#38a169"
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Expanded */}
                    {expandedTx[tx.id] && (
                      <View style={styles.expanded}>
                        <Text>ID: {tx.id}</Text>
                        <Text>Date: {new Date(tx.date).toLocaleString()}</Text>
                        <Text>Balance After: KES {tx.balance_after}</Text>
                        <Text>Notes: {tx.notes || "N/A"}</Text>

                        {tx.status === "pending" && (
                          <View style={{ flexDirection: "row", marginTop: 10 }}>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.approveBtn]}
                              onPress={() => handleAction(tx.id, "approved")}
                            >
                              <AntDesign
                                name="checkcircle"
                                size={18}
                                color="white"
                              />
                              <Text style={styles.btnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.rejectBtn]}
                              onPress={() => handleAction(tx.id, "rejected")}
                            >
                              <AntDesign
                                name="closecircle"
                                size={18}
                                color="white"
                              />
                              <Text style={styles.btnText}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}
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
