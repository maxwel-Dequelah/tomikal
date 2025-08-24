// app/deposits-shares.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const DepositsSharesScreen = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [adminViewAll, setAdminViewAll] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { width } = useWindowDimensions();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem("access");
        const userData = await AsyncStorage.getItem("user");
        if (!token) {
          showAlert("Error", "Unable to fetch access token.");
          return;
        }

        const parsedUser = userData ? JSON.parse(userData) : null;
        setUser(parsedUser);

        // Fetch transactions
        const { data } = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}/api/transactions/`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const normalized = (data || [])
          .map((d) => ({
            ...d,
            date: d.date,
            amount: Number(d.amount || 0),
            status: d.status || "pending",
            source: d.source || "-",
            transaction_type: d.transaction_type || "-",
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setTransactions(normalized);
        setFilteredTransactions(normalized);

        // If admin, fetch all users for filtering
        if (parsedUser?.is_admin) {
          const { data: usersData } = await axios.get(
            `${process.env.EXPO_PUBLIC_API_URL}/api/users/`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setAllUsers(usersData || []);
        }
      } catch (error) {
        console.error("Error fetching transactions/users:", error);
        showAlert("Error", "Something went wrong while fetching data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    if (!adminViewAll && user) {
      filtered = filtered.filter((item) => item.user?.id === user.id);
    } else if (adminViewAll && selectedUser) {
      filtered = filtered.filter((item) => item.user?.id === selectedUser);
    }

    if (transactionType !== "all") {
      filtered = filtered.filter(
        (item) => item.transaction_type === transactionType
      );
    }

    if (startDate) {
      filtered = filtered.filter((item) => new Date(item.date) >= startDate);
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => new Date(item.date) <= endOfDay);
    }

    setFilteredTransactions(filtered);
  }, [
    transactions,
    transactionType,
    startDate,
    endDate,
    adminViewAll,
    selectedUser,
  ]);

  // Alerts (cross-platform)
  const showAlert = (title, message) => {
    if (Platform.OS !== "web") {
      Alert.alert(title, message);
    } else if (typeof window !== "undefined" && window.alert) {
      window.alert(`${title}\n\n${message}`);
    }
  };

  // ✅ Expo Router logout
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            router.replace("/login");
          } catch (err) {
            showAlert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={styles.stickyHeader}>
      <ImageBackground
        source={require("./assets/sacco_logo.jpeg")}
        style={styles.headerBackground}
      >
        <Text style={styles.headerTitle}>Tomikal SHG</Text>
        <Text style={styles.accountText}>{user?.username}</Text>
        <Text style={styles.accountNumber}>
          {user ? String(user.id).toUpperCase() : "waiting"}
        </Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Transaction Type:</Text>
      <Picker
        selectedValue={transactionType}
        onValueChange={(value) => setTransactionType(value)}
        style={styles.picker}
      >
        <Picker.Item label="All" value="all" />
        <Picker.Item label="Deposit" value="deposit" />
        <Picker.Item label="Withdrawal" value="withdrawal" />
        <Picker.Item label="Emergency" value="emergency" />
      </Picker>

      <View style={styles.dateRow}>
        <TouchableOpacity
          onPress={() => setShowStartPicker(true)}
          style={styles.datePickerButton}
        >
          <Text style={styles.datePickerText}>
            {startDate ? startDate.toDateString() : "Start Date"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowEndPicker(true)}
          style={styles.datePickerButton}
        >
          <Text style={styles.datePickerText}>
            {endDate ? endDate.toDateString() : "End Date"}
          </Text>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowStartPicker(false);
            if (d) setStartDate(d);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(e, d) => {
            setShowEndPicker(false);
            if (d) setEndDate(d);
          }}
        />
      )}

      {user?.is_admin && (
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              adminViewAll ? styles.toggleOn : styles.toggleOff,
            ]}
            onPress={() => setAdminViewAll((prev) => !prev)}
          >
            <Text style={styles.toggleText}>
              {adminViewAll ? "Viewing: All Users" : "Viewing: My Transactions"}
            </Text>
          </TouchableOpacity>

          {adminViewAll && (
            <>
              <Text style={[styles.filterLabel, { marginTop: 10 }]}>
                Select User:
              </Text>
              <Picker
                selectedValue={selectedUser}
                onValueChange={(val) => setSelectedUser(val)}
                style={styles.picker}
              >
                <Picker.Item label="-- All Users --" value={null} />
                {allUsers.map((u) => (
                  <Picker.Item
                    key={u.id}
                    label={`${u.first_name || ""} ${u.last_name || ""}`}
                    value={u.id}
                  />
                ))}
              </Picker>
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderTable = () => (
    <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.table, { minWidth: width < 700 ? 800 : 900 }]}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { minWidth: 180 }]}>
            Member
          </Text>
          <Text style={styles.tableHeaderCell}>Type</Text>
          <Text style={styles.tableHeaderCell}>Amount</Text>
          <Text style={styles.tableHeaderCell}>Source</Text>
          <Text style={styles.tableHeaderCell}>Status</Text>
          <Text style={[styles.tableHeaderCell, { minWidth: 200 }]}>
            Date & Time
          </Text>
        </View>
        {filteredTransactions.length === 0 ? (
          <View style={styles.noDataRow}>
            <Text style={styles.noDataText}>
              No records match the selected filters.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { minWidth: 180 }]}>
                {item.user?.first_name || ""} {item.user?.last_name || ""}
              </Text>
              <Text style={styles.tableCell}>{item.transaction_type}</Text>
              <Text style={styles.tableCell}>
                KES {Number(item.amount || 0).toLocaleString()}
              </Text>
              <Text style={styles.tableCell}>{item.source || "-"}</Text>
              <Text
                style={[
                  styles.tableCell,
                  item.status === "approved"
                    ? styles.statusApproved
                    : item.status === "rejected"
                    ? styles.statusRejected
                    : styles.statusPending,
                ]}
              >
                {String(item.status).toUpperCase()}
              </Text>
              <Text style={[styles.tableCell, { minWidth: 200 }]}>
                {item.date ? new Date(item.date).toLocaleDateString() : "-"}{" "}
                {item.date ? new Date(item.date).toLocaleTimeString() : ""}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  const renderBottomBar = () => (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/dashboard")}
      >
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.content}>
        {renderFilters()}
        {renderTable()}
      </ScrollView>
      {renderBottomBar()}
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: { flex: 1, backgroundColor: "#fff" },
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
  content: { paddingBottom: 100 },
  filterContainer: {
    padding: 15,
    backgroundColor: "#f2f2f2",
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
  },
  filterLabel: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  picker: { backgroundColor: "#fff", borderRadius: 5, marginBottom: 10 },
  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  datePickerButton: {
    flex: 1,
    padding: 10,
    marginRight: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    alignItems: "center",
  },
  datePickerText: { color: "#333" },
  toggleButton: { padding: 10, borderRadius: 5, alignItems: "center" },
  toggleOn: { backgroundColor: "#4CAF50" },
  toggleOff: { backgroundColor: "#ccc" },
  toggleText: { color: "#fff", fontWeight: "600" },
  table: { padding: 10 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#4CAF50",
    paddingBottom: 8,
    marginBottom: 6,
    backgroundColor: "#e8f5e9",
  },
  tableHeaderCell: {
    minWidth: 120,
    fontWeight: "700",
    textAlign: "left",
    color: "#2e7d32",
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  tableCell: {
    minWidth: 120,
    textAlign: "left",
    color: "#444",
    paddingHorizontal: 6,
  },
  noDataRow: { padding: 16, alignItems: "center" },
  noDataText: { color: "#666" },
  statusApproved: { color: "green", fontWeight: "700" },
  statusRejected: { color: "red", fontWeight: "700" },
  statusPending: { color: "orange", fontWeight: "700" },
  bottomBar: {
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  backButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    width: "90%",
    alignSelf: "center",
  },
  backButtonText: { color: "#fff", fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default DepositsSharesScreen;
